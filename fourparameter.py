
import os
import json
import pandas
import numpy as np
import matplotlib.pyplot as plt
import scipy.optimize
import requests



def fourPL(x, A, B, C, D):
    return ((A-D)/(1.0+((x/C)**(B))) + D)

def curve_fit_fourPL(x_data, y_data):
    params, params_covariance = scipy.optimize.curve_fit(fourPL, x_data, y_data)
    A, B, C, D = params[0], params[1], params[2], params[3]
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
    x_data = np.array([i for i, value in enumerate(x_labels)])
    y_data = np.array([y for x, y in data[country].items() if y != 0])
    

    return x_data, y_data

if __name__ == "__main__":
    country = "Korea, South"
    data = get_csv_data()

    x_data, y_data = get_country_data(data, country)

    A, B, C, D = curve_fit_fourPL(x_data, y_data)
    
    print(f'A: {A}')
    print(f'B: {B}')
    print(f'C: {C}')
    print(f'D: {D}')

    x_min, x_max = np.amin(x_data), np.amax(x_data)
    xs = np.linspace(x_min, x_max, 1000)
    plt.scatter(x_data, y_data)
    plt.plot(xs, fourPL(xs, A, B, C, D))
    plt.show()
    
    var = 2