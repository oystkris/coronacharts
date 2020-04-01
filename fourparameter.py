
import os
import json
import pandas
import numpy as np
import matplotlib.pyplot as plt
import scipy.optimize
import requests
import datetime 
import uncertainties
import uncertainties.unumpy as unp
from uncertainties import ufloat

import emcee

script_path = os.path.dirname(os.path.realpath(__file__))

fig, ax_shared = plt.subplots()

def fourPL(x, A, B, C, D):
    return ((A-D)/(1.0+((x/C)**(B))) + D)

def four_pl_fit_function(x, A, B, C, D):
    return (( (A-D) / (1.0 + np.power( (x/C), B) ) ) + D)

# def four_pl_fit_function(x, a, b, c):
#     return a / (1 + np.exp(-b * (x - c)))

# def four_pl_fit_jacobian(x, a, b, c):
#     return np.transpose(
#         [
#             1 / (1 + np.exp(-b * (x - c))),
#             -a / ((1 + np.exp(-b * (x - c))) ** 2) * (c - x) * np.exp(-b * (x - c)),
#             -a / ((1 + np.exp(-b * (x - c))) ** 2) * b * np.exp(-b * (x - c)),
#         ]
#     )

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
    A_err, B_err, C_err, D_err = 0, 0, 0, 0

    if len(x_data) < 4: return A, B, C, D

    try:
        params, params_covariance = scipy.optimize.curve_fit(
            four_pl_fit_function, 
            x_data, 
            y_data, 
            maxfev=10000
        )
        A, B, C, D = params[0], params[1], params[2], params[3]
        err = np.sqrt(np.diag(params_covariance))
        A_err, B_err, C_err, D_err = err[0],err[1],err[2],err[3]
    except:
        try:
            A_guess = 0
            B_guess = max_slope(y_data)
            C_guess = x_data[int(len(x_data) / 2)]
            D_guess = max(y_data) * 0.95
            guess = [A_guess, B_guess, C_guess, D_guess]
            params, params_covariance = scipy.optimize.curve_fit(
                fourPL, 
                x_data, 
                y_data, 
                p0=guess, 
                maxfev=10000
            )
            A, B, C, D = params[0], params[1], params[2], params[3]
            err = np.sqrt(np.diag(params_covariance))
            A_err, B_err, C_err, D_err = err[0], err[1], err[2], err[3]
        except:
            raise

    if np.inf in [A_err, B_err, C_err, D_err] or np.isnan(A_err) or np.isnan(B_err) or np.isnan(C_err) or np.isnan(D_err):
        A_err, B_err, C_err, D_err = 0, 0, 0, 0

    params_err = np.sqrt(np.diag(params_covariance))
    a = ufloat(params[0], params_err[0])
    b = ufloat(params[1], params_err[1])
    c = ufloat(params[2], params_err[2])
    d = ufloat(params[3], params_err[3])

    fit_x_unc = np.linspace(x_data[0], x_data[-1], 300)
    fit_y_unc = (( (a-d) / (1.0 + np.power( (fit_x_unc/c), b) ) ) + d)
    nom_x = unp.nominal_values(fit_x_unc)
    nom_y = unp.nominal_values(fit_y_unc)
    std_y = unp.std_devs(fit_y_unc)

    lower_y = nom_y - std_y
    upper_y = nom_y + std_y

    if len(x_data) > 40: row_regression_color = 'b'
    else: row_regression_color = 'r'
    
    ax_shared.plot(nom_x, nom_y, color=row_regression_color, linewidth=3)
    # ax_shared.plot(nom_x, lower_y, color='g', linewidth=3)
    # ax_shared.plot(nom_x, upper_y, color='r', linewidth=3)
    ax_shared.fill_between(
        nom_x,
        lower_y,
        upper_y,
        facecolor=row_regression_color,
        alpha=0.6
    )
    

    # return A, B, C, D, A_err, B_err, C_err, D_err
    return A, B, C, D


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
    min_logistic_size = 5

    total_count, fail_count = 0, 0
    four_pl_dict = {}
    for country, values in data.items():
        if country not in  ["Norway", "Italy"]: continue
        four_pl_dict[country] = {}
        x_data, y_data, x_labels = get_country_data(data, country)
        last_date = x_labels[-1]
        if len(x_labels) > min_logistic_size:
            for date in x_labels[min_logistic_size:]:
                if date != last_date: continue
                total_count += 1
                date_index = x_labels.index(date)
                limit_x_data, limit_y_data = np.array(x_data[:date_index]), np.array(y_data[:date_index])

                try:
                    A, B, C, D, A_err, B_err, C_err, D_err = curve_fit_least_square_fourPL(limit_x_data, limit_y_data)
                    four_pl_dict[country][date] = {
                        "A": A,
                        "B": B,
                        "C": C,
                        "D": D,
                        "A_err": A_err,
                        "B_err": B_err,
                        "C_err": C_err,
                        "D_err": D_err
                    }
                except RuntimeError as e:
                    print(f'RuntimeError: couldnt do curvefit for {country}')
                    fail_count += 1
                except TypeError as e:
                    print(f'TypeError: couldnt do curvefit for {country}')
                    fail_count += 1
                except ValueError as e:
                    print(f'ValueError: couldnt do curvefit for {country}')
                    fail_count += 1

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
