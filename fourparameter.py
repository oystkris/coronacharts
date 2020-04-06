
import os
import json
import pandas
import numpy as np
import matplotlib.pyplot as plt
import scipy.optimize
import sklearn
from sklearn.metrics import r2_score
import requests
import datetime 
import uncertainties
import uncertainties.unumpy as unp
from uncertainties import ufloat

import emcee

np.seterr(all='raise')

row_regression_color = 'b'

script_path = os.path.dirname(os.path.realpath(__file__))

fig, ax_shared = plt.subplots()

def fourPL(x, A, B, C, D):
    return ((A-D)/(1.0+((x/C)**(B))) + D)

def four_pl_fit_function(x, A, B, C, D):
    try:
        if not (np.isfinite(A) and np.isfinite(B) and np.isfinite(C) and np.isfinite(D)):
            return -99999 * x
        if C == 0: 
            return -99999 * x
        if A < -10000000000:
            return -99999 * x
        if B > 10000000000:
            return -99999 * x
        if D > 10000000000:
            return -99999 * x
        if 0. in (1.0 + np.power( (x/C), B) ):
            return -99999 * x
        return (( (A-D) / (1.0 + np.power( (x/C), B) ) ) + D)
    except FloatingPointError:
        # print("handle logistic")
        return -99999 * x
    except:
        raise

def four_pl_fit_jacobian(x, A, B, C, D):
    def error_matrix():
        return np.transpose(
            [
                -99999 * x,
                -99999 * x,
                -99999 * x,
                -99999 * x
            ]
        )
    try:
        if not (np.isfinite(A) and np.isfinite(B) and np.isfinite(C) and np.isfinite(D)):
            return error_matrix()
        # if A < -10000000000:
        #     return error_matrix()
        # if B > 10000000000:
        #     return error_matrix()
        # if D > 10000000000:
        #     return error_matrix()
        if C == 0: 
            return error_matrix()
        if 0. in ( 1 + np.power((x - C), B) ):
            return error_matrix()
        if 0. in ( np.power( (np.power((x - C), B) + 1), 2) ):
            return error_matrix()
        if 0. in ( np.power( (np.power((x - C), B) + 1), 2) * C ):
            return error_matrix()
        if 0. in ( 1 + np.power((x - C), B) ):
            return error_matrix()
        return np.transpose(
            [
                1 / ( 1 + np.power((x - C), B) ),
                ( (A - D) * np.power((x - C), B) * np.log((x/C)) ) / ( np.power( (np.power((x - C), B) + 1), 2) ),
                ( B * (A-D) * np.power((x - C), B) ) / ( np.power( (np.power((x - C), B) + 1), 2) * C ),
                1 - ( 1 / (1 + np.power((x - C), B)) )
            ]
        )
    except FloatingPointError:
        # print("handle jacobian")
        return error_matrix()
    except:
        raise

def curve_fit_bayesian_fourPL(x_data, y_data):
    def max_slope(y_values):
        steepest = 0
        for i in range(len(y_values)):
            try:
                slope = int(y_values[i+1] - y_values[i])
                if slope > steepest: steepest = slope
            except:
                pass
        return steepest

    A, B, C, D = 1, 1, 1, 1
    A_err, B_err, C_err, D_err = 0, 0, 0, 0

    A_guess = 0
    B_guess = max_slope(y_data)
    C_guess = x_data[int(len(x_data) / 2)]
    D_guess = max(y_data) * 0.95

    starting_guesses =np.array([A_guess, B_guess, C_guess, D_guess])

    ndim = 4  # number of parameters in the model
    nwalkers = 50  # number of MCMC walkers
    nburn = 1000  # "burn-in" period to let chains stabilize
    nsteps = 2000  # number of MCMC steps to take

    sampler = emcee.EnsembleSampler(nwalkers, ndim, fourPL, args=[x_data, y_data])

    sampler.run_mcmc(starting_guesses, nsteps)

    emcee_trace = sampler.chain[:, nburn:, :].reshape(-1, ndim).T
    return "lol"

def curve_fit_least_square_fourPL(x_data, y_data):
    def max_slope(y_values):
        steepest = 0
        for i in range(len(y_values)):
            try:
                slope = int(y_values[i+1] - y_values[i])
                if slope > steepest: steepest = slope
            except:
                pass
        return steepest

    if len(x_data) != len(y_data):
        print("FORSKJELL I LENGDE PÅ INPUT-DATA")

    A, B, C, D = 1, 1, 1, 1

    if len(x_data) < 4: return A, B, C, D

    A_guess = 0
    B_guess = 5 # max_slope(y_data)
    C_guess = float(x_data[int(len(x_data) / 2)])
    D_guess = max(y_data) * 0.95

    if y_data[-1] < y_data[0]:
        B_guess = -1 * B_guess

    guess = [A_guess, B_guess, C_guess, D_guess]

    try:
        params, params_covariance = scipy.optimize.curve_fit(
            four_pl_fit_function, 
            x_data, 
            y_data, 
            p0=guess, 
            maxfev=100000,
            # jac=four_pl_fit_jacobian,
            # bounds=(0, int(len(x_data)))
        )
        A, B, C, D = params[0], params[1], params[2], params[3]
    except:
        # print("serious trouble")
        raise

    # print(A, B, C, D)
    return A, B, C, D, params_covariance

def get_upper_lower_limits(x_data, A, B, C, D, params_covariance):
    try:
        params_err = np.sqrt(np.diag(params_covariance))
        a = ufloat(A, params_err[0])
        b = ufloat(B, params_err[1])
        c = ufloat(C, params_err[2])
        d = ufloat(D, params_err[3])

        fit_x_unc = np.linspace(x_data[0], len(x_data)*3, 300)
        fit_y_unc = (( (a-d) / (1.0 + np.power( (fit_x_unc/c), b) ) ) + d)
        nom_x = unp.nominal_values(fit_x_unc)
        nom_y = unp.nominal_values(fit_y_unc)
        std_y = unp.std_devs(fit_y_unc)
        std_y[0] = std_y[1]

        lower_y = np.nan_to_num(nom_y - std_y)
        upper_y = np.nan_to_num(nom_y + std_y)
    except:
        raise

    # if len(x_data) > 40: row_regression_color = 'm'
    # else: row_regression_color = 'y'
    # ax_shared.plot(fit_x_unc, lower_y, color=row_regression_color, linewidth=2)
    # ax_shared.plot(fit_x_unc, upper_y, color=row_regression_color, linewidth=2)

    A_lower, B_lower, C_lower, D_lower, _ = curve_fit_least_square_fourPL(np.array([x for x in fit_x_unc]), np.array([y for y in lower_y]))
    A_upper, B_upper, C_upper, D_upper, _ = curve_fit_least_square_fourPL(np.array([x for x in fit_x_unc]), np.array([y for y in upper_y]))

    return A_lower, B_lower, C_lower, D_lower, A_upper, B_upper, C_upper, D_upper

def plot_unc(x_data, y_data, A, B, C, D, A_lower, B_lower, C_lower, D_lower, A_upper, B_upper, C_upper, D_upper):
    global row_regression_color
    # if len(x_data) > 40: row_regression_color = 'b'
    # else: row_regression_color = 'r'

    nom_y = four_pl_fit_function(x_data, A, B, C, D)
    lower_y = four_pl_fit_function(x_data, A_lower, B_lower, C_lower, D_lower)
    upper_y = four_pl_fit_function(x_data, A_upper, B_upper, C_upper, D_upper)

    r2 = r2_score(y_data, nom_y)
    r2_lower = r2_score(y_data, lower_y)
    r2_higher = r2_score(y_data, upper_y)

    alpha = r2_higher
    if alpha < 0.1: alpha = 0.1
    
    ax_shared.plot(x_data, nom_y, color=row_regression_color, linewidth=3)
    # ax_shared.plot(nom_x, lower_y, color='g', linewidth=3)
    # ax_shared.plot(nom_x, upper_y, color='r', linewidth=3)
    ax_shared.fill_between(
        x_data,
        lower_y,
        upper_y,
        facecolor=row_regression_color,
        alpha=alpha
    )


def get_csv_data():

    data = {}
    df = pandas.read_csv(r"https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv")
    df['Country/Region'].replace(["Korea, South"], 'South Korea', inplace=True)
    dates = list(df.columns.values)[4:]
    for index, row in df.iterrows():
        country = row['Country/Region']
        state = row['Province/State']
        if "," in str(state):
            print(f'skipping {state}')
            continue
        if country not in data:
            data[country] = {}
        
        for date in dates:
            if date not in data[country]: data[country][date] = row[date]
            else: data[country][date] += row[date]
        
    return data

def get_country_data(data, country):
    def sortable_date(date):
        splt = date.split('/')
        date_string = f'{splt[0]}/{splt[1]}/20{splt[2]}'
        date = datetime.datetime.strptime(date_string, '%m/%d/%Y')
        return date

    x_y_tuples = sorted([(x, y) for x, y in data[country].items() if y != 0], key = lambda tup: sortable_date(tup[0]))
    
    x_labels = [x for x, y in x_y_tuples if y != 0]

    x_data = [i for i, value in enumerate(x_labels)]
    y_data = [y for x, y in x_y_tuples if y != 0]

    return x_data, y_data, x_labels

def curve_fit_all_countries(data):
    global row_regression_color
    min_logistic_size = 20

    total_count, fail_count = 0, 0
    four_pl_dict = {}
    for country, values in data.items():
        # if country not in  ["Norway", "Sweden", "Italy"]: continue
        if country == "Norway": row_regression_color = 'r'
        elif country == "Sweden": row_regression_color = 'b'
        elif country == "Italy": row_regression_color = 'g'
        else: row_regression_color = 'black'
        four_pl_dict[country] = {}
        x_data, y_data, x_labels = get_country_data(data, country)
        last_date = x_labels[-1]
        if len(x_labels) > min_logistic_size:
            for date in x_labels[min_logistic_size:]:
                # if date != last_date: continue
                total_count += 1
                date_index = x_labels.index(date)
                limit_x_data, limit_y_data = np.array(x_data[:date_index]), np.array(y_data[:date_index])

                if limit_y_data[-1] < 200: continue

                try:
                    A, B, C, D, p_cov = curve_fit_least_square_fourPL(limit_x_data, limit_y_data)
                    A_lower, B_lower, C_lower, D_lower, A_upper, B_upper, C_upper, D_upper = get_upper_lower_limits(x_data, A, B, C, D, p_cov)
                    # plot_unc(limit_x_data, limit_y_data, A, B, C, D, A_lower, B_lower, C_lower, D_lower, A_upper, B_upper, C_upper, D_upper)
                    four_pl_dict[country][date] = {
                        "A": round(A, 3),
                        "B": round(B, 3),
                        "C": round(C, 3),
                        "D": round(D, 3),
                        "A_l": round(A_lower, 3),
                        "B_l": round(B_lower, 3),
                        "C_l": round(C_lower, 3),
                        "D_l": round(D_lower, 3),
                        "A_u": round(A_upper, 3),
                        "B_u": round(B_upper, 3),
                        "C_u": round(C_upper, 3),
                        "D_u": round(D_upper, 3)
                    }
                except RuntimeError as e:
                    print(f'RuntimeError: couldnt do curvefit for {country}')
                    fail_count += 1
                    # raise
                except TypeError as e:
                    print(f'TypeError: couldnt do curvefit for {country}')
                    fail_count += 1
                    # raise
                except ValueError as e:
                    print(f'ValueError: couldnt do curvefit for {country}')
                    fail_count += 1
                    # raise
                except FloatingPointError as e:
                    print(f'FloatingPointError: couldnt do curvefit for {country}')
                    fail_count += 1
                    # raise
                

    print(f'{total_count - fail_count} / {total_count} succeeded ({round(((total_count - fail_count)/total_count)*100, 2)}%)')
    return four_pl_dict

if __name__ == "__main__":
    # country = "Korea, South"
    data = get_csv_data()

    four_pl_dict = curve_fit_all_countries(data)
    out_json = os.path.join(script_path, '4pl.json')
    with open(out_json, 'w') as json_file:
        json.dump(four_pl_dict, json_file, indent=4)

    plt.show()
