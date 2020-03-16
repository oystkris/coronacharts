
import os
import json
import pandas
import numpy as np
import matplotlib.pyplot as plt
import scipy.optimize
import requests

script_path = os.path.dirname(os.path.realpath(__file__))

def fourPL(x, A, B, C, D):
    return ((A-D)/(1.0+((x/C)**(B))) + D)

def curve_fit_fourPL(x_data, y_data):
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



    try:
        params, params_covariance = scipy.optimize.curve_fit(fourPL, x_data, y_data, maxfev=10000)
        A, B, C, D = params[0], params[1], params[2], params[3]
    except:
        try:
            A_guess = 0
            B_guess = max_slope(y_data)
            C_guess = x_data[int(len(x_data) / 2)]
            D_guess = max(y_data) * 0.95
            guess = [A_guess, B_guess, C_guess, D_guess]
            params, params_covariance = scipy.optimize.curve_fit(fourPL, x_data, y_data, p0=guess, maxfev=10000)
            A, B, C, D = params[0], params[1], params[2], params[3]
        except:
            raise

    return A, B, C, D


def get_csv_data():

    data = {}
    df = pandas.read_csv(r"https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv")

    dates = list(df.columns.values)[4:]
    for index, row in df.iterrows():
        country = row['Country/Region']
        if country not in data:
            data[country] = {}
        
        for date in dates:
            if date not in data[country]: data[country][date] = row[date]
            else: data[country][date] += row[date]
        
    return data

def get_country_data(data, country):
    
    x_labels = [x for x, y in data[country].items() if y != 0]
    x_data = [i for i, value in enumerate(x_labels)]
    y_data = [y for x, y in data[country].items() if y != 0]

    return x_data, y_data, x_labels

def curve_fit_all_countries(data):
    total_count, fail_count = 0, 0
    four_pl_dict = {}
    for country, values in data.items():
        four_pl_dict[country] = {}
        
        x_data, y_data, x_labels = get_country_data(data, country)
        if country == "Norway":
            var = 2
        if len(x_labels) > 4:
            for date in x_labels[4:]:
                total_count += 1
                date_index = x_labels.index(date)
                limit_x_data, limit_y_data = np.array(x_data[:date_index]), np.array(y_data[:date_index])

                try:
                    A, B, C, D = curve_fit_fourPL(limit_x_data, limit_y_data)
                    if date == "3/15/20" and country == "Norway":
                        var = 2
                    four_pl_dict[country][date] = {
                        "A": A,
                        "B": B,
                        "C": C,
                        "D": D
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
    
    # print(f'A: {A}')
    # print(f'B: {B}')
    # print(f'C: {C}')
    # print(f'D: {D}')

    # x_min, x_max = np.amin(x_data), np.amax(x_data)
    # xs = np.linspace(x_min, x_max, 1000)
    # plt.scatter(x_data, y_data)
    # plt.plot(xs, fourPL(xs, A, B, C, D))
    # plt.show()
    
    var = 2