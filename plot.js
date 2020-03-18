

var dictionary = {};
var four_parameter_json;
var countries = [];
var currentCountry = "Norway";

var initNumdays, currentNumDays;

async function main() {
    $.getJSON("./4pl.json", function(json) {
        four_parameter_json = json;
        console.log(json); // this will show the info it in firebug console
    });

    // console.log(jsontest)
    await getData();
    await new Promise(r => setTimeout(r, 2000));

    refreshAllData(currentCountry, null);
}

async function getData() {
    $(document).ready(function () {
        $.ajax({
            type: "GET",
            url: "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv",
            dataType: "text",
            success: function (data) {
                processData(data);
            }
        });
    });
}

function processData(allText) {
    var allText = allText.replace("\"Korea, South\"", "South Korea");
    var allTextLines = allText.split(/\r\n|\n/);
    var headers = allTextLines[0].split(',');
    var dates = headers.slice(Math.max(headers.length - (headers.length - 4), 1))

    console.log(headers);
    console.log(dates);

    for (var i = 1; i < allTextLines.length; i++) {

        var data = allTextLines[i].split(',');
        if (!allTextLines[i].includes("\"")) {

            var country = data[1];
            if (!(country in dictionary)) {
                dictionary[country] = {};
                countries.push(country);
            }

            if (country == "Norway"){
                var a = 2
            }

            var date_index;
            dates.forEach(function (item, loop_index) {
                date_index = loop_index + 4;
                var date = item;
                var confirmed = parseInt(data[date_index])
                if (confirmed > 0) {
                    if (date in dictionary[country]) {
                        dictionary[country][date] += confirmed
                    }
                    else {
                        dictionary[country][date] = confirmed
                    }
                }
            });

        }
    }
    // Set values in country drowdown
    var options = '';

    countries.sort();

    for(var i = 0; i < countries.length; i++) {
        options += '<option value="' + countries[i] + '" />';
    }
  
    document.getElementById('countries').innerHTML = options;
}

async function refreshAllData(country, numDays){
    let plotParameters = await plotData(country, numDays);
    await drawEquations(plotParameters)
}

async function drawEquations(parameters){

    exponential_r2 = '\\LARGE r^2 = ' + parameters.exponentialTrace.r2.toFixed(4).toString();
    exponential_eq = '\\LARGE y = ' + parameters.exponentialTrace.a.toFixed(2).toString() + 'e^{' + parameters.exponentialTrace.b.toFixed(2).toString() + 'x}'

    var exp_r2_eq = document.getElementById('ExponentialR2');
    katex.render(exponential_r2, exp_r2_eq, {
        throwOnError: false
    });

    var exp_eq = document.getElementById('ExponentialEquation');
    katex.render(exponential_eq, exp_eq, {
        throwOnError: false
    });

    var logistic_r2 = '\\LARGE r^2 = ' + parameters.logisticTrace.r2.toFixed(4).toString() + ''
    var logistic_eq = '\\LARGE y = ' + parameters.logisticTrace.d.toFixed(2).toString() + ' + \\frac{' + parameters.logisticTrace.a.toFixed(2).toString() + ' - ' + parameters.logisticTrace.d.toFixed(2).toString() + '}{1 + (\\frac{x}{' + parameters.logisticTrace.c.toFixed(2).toString() + '})^{' + parameters.logisticTrace.b.toFixed(2).toString() + '}}';

    var log_r2_eq = document.getElementById('LogisticR2');
    katex.render(logistic_r2, log_r2_eq, {
        throwOnError: false
    });

    var log_eq = document.getElementById('LogisticEquation');
    katex.render(logistic_eq, log_eq, {
        throwOnError: false
    });
}

async function plotData(country, numDays) {

    var x_data_label = $.map(dictionary[country], function (value, key) { return key });
    
    initNumdays = x_data_label.length;
    if (!numDays) {
        currentNumDays = initNumdays;
    }

    var confirmedCasesTrace = getConfirmedCasesTrace(x_data_label, country, numDays);
    var final_date = confirmedCasesTrace.x_data.slice(-1)[0]

    var exponentialTrace = getExponentialTrace(confirmedCasesTrace.x_data, confirmedCasesTrace.y_data);
    var logisticTrace = getLogisticTrace(confirmedCasesTrace.x_data, confirmedCasesTrace.y_data, country, final_date);

    var plot_title = `Cases of Covid-19 in ${country} `

    var trace1 = {
        x: confirmedCasesTrace.x_data,
        y: confirmedCasesTrace.y_data,
        name: 'Confirmed cases',
        type: 'scatter'
    };

    var trace2 = {
        x: exponentialTrace.x_data,
        y: exponentialTrace.y_data,
        name: 'logistic',
        type: 'scatter'
    };
        
    if (logisticTrace.x_data != null) {
        var trace3 = {
            x: logisticTrace.x_data,
            y: logisticTrace.y_data,
            name: 'exponential',
            type: 'scatter'
        };

        var data = [trace1, trace2, trace3];
    }
    else {
        var data = [trace1, trace2];
    }
    var layout = {
        title: {
            text: plot_title,
            font: {
                family: 'Courier New, monospace',
                size: 24
            },
            xref: 'paper',
            x: 0.05,
        },
        width: 1500,
        height: 900
    };

    Plotly.newPlot('mainPlot', data, layout);

    return{
        confirmedCasesTrace,
        exponentialTrace,
        logisticTrace
    };
}

function getLogisticTrace(x_data, confirmed_y_data, country, finalDate){

    var log_point_list = [];
    var lginf = four_parameter_json[country][finalDate];

    if (lginf != null){
        var x_data_index = [];
        var logistic_y_data = [];
    
        x_data.forEach(function (item, index) {
            x_data_index.push(index)
        });

        x_data_index.forEach(function (x, index) {
            var logistic_y = logistic(x, lginf.A, lginf.B, lginf.C, lginf.D)
            logistic_y_data.push(logistic_y);
            log_point_list.push([x, logistic_y])
        });

        var r2 = determinationCoefficient(x_data, confirmed_y_data, log_point_list);
        return{
            x_data,
            y_data: logistic_y_data,
            a: lginf.A,
            b: lginf.B, 
            c: lginf.C, 
            d: lginf.D,
            r2
        }
    }
    else{
        return{
            x_data: null,
            y_data: null,
            a: null,
            b: null,
            c: null,
            d: null,
            r2: null
        }
    }
}

function getConfirmedCasesTrace(x_data_label, country, numDays){
    // leave only days from 0 - numDays

    var x_data = x_data_label
    if (numDays) {
        x_data = x_data_label.slice(0, numDays);
    }

    var y_data = $.map(dictionary[country], function (value, key) { return value });
    if (numDays) {
        y_data = y_data.slice(0, numDays);
    }
    return{
        x_data,
        y_data
    }
}

function getExponentialTrace(x_data, confirmed_y_data){
    var x_data_index = [];
    var y_data = [];
    var logistic_y_data = [];

    x_data.forEach(function (item, index) {
        x_data_index.push(index)
    });

    var exp_info = getExponentialConstants(x_data_index, confirmed_y_data, 10);

    x_data_index.forEach(function (item, index) {
        y_data.push(exponential(item, exp_info.a, exp_info.b));
    });

    var r2 = determinationCoefficient(x_data_index, y_data, exp_info.points);

    var a = exp_info.a;
    var b = exp_info.b;

    return{
        x_data,
        y_data,
        a,
        b,
        r2
    }

}

function exponential(x, a, b) {
    return a * Math.exp(b * x);
}

function logistic(x, a, b, c, d){
    return d + ((a - d) / (1 + (Math.pow((x/c), b))))
}

function getExponentialConstants(x_data, y_data, precision) {
    // https://github.com/Tom-Alexander/regression-js/blob/master/src/regression.js
    var data = [];
    x_data.forEach(function (item, index) {
        point = [item, y_data[index]];
        data.push(point); 
    });

    const sum = [0, 0, 0, 0, 0, 0];

    for (let n = 0; n < data.length; n++) {
        if (data[n][1] !== null) {
            sum[0] += data[n][0];
            sum[1] += data[n][1];
            sum[2] += data[n][0] * data[n][0] * data[n][1];
            sum[3] += data[n][1] * Math.log(data[n][1]);
            sum[4] += data[n][0] * data[n][1] * Math.log(data[n][1]);
            sum[5] += data[n][0] * data[n][1];
        }
    }

    const denominator = ((sum[1] * sum[2]) - (sum[5] * sum[5]));
    const a = Math.exp(((sum[2] * sum[3]) - (sum[5] * sum[4])) / denominator);
    const b = ((sum[1] * sum[4]) - (sum[5] * sum[3])) / denominator;
    const coeffA = Math.round(a, precision);
    const coeffB = Math.round(b, precision);
    const predict = x => ([
        x,
        Math.round(a * Math.exp(b * x)),
    ]);

    const points = data.map(point => predict(point[0]));

    return {
        points,
        a,
        b,
    };
}

function determinationCoefficient(x_data, y_data, results) {
    // https://github.com/Tom-Alexander/regression-js/blob/master/src/regression.js
    var data = [];
    const predictions = [];
    const observations = [];

    x_data.forEach(function (item, index) {
        point = [item, y_data[index]];
        data.push(point); 
    });

    data.forEach((d, i) => {
        if (d[1] !== null) {
            observations.push(d);
            predictions.push(results[i]);
        }
    });

    const sum = observations.reduce((a, observation) => a + observation[1], 0);
    const mean = sum / observations.length;

    const ssyy = observations.reduce((a, observation) => {
        const difference = observation[1] - mean;
        return a + (difference * difference);
    }, 0);

    const sse = observations.reduce((accum, observation, index) => {
        const prediction = predictions[index];
        const residual = observation[1] - prediction[1];
        return accum + (residual * residual);
    }, 0);

    return 1 - (sse / ssyy);
}

function setPreviousDay() {
    if (currentNumDays > 0) {
        currentNumDays--;
        refreshAllData(currentCountry, currentNumDays)
    }
}

function setNextDay() {
    if (currentNumDays < initNumdays) {
        currentNumDays++;
        refreshAllData(currentCountry, currentNumDays)
    }
}

function setPreviousWeek(){
    if (currentNumDays - 7 > 0) {
        currentNumDays = currentNumDays - 7;
        refreshAllData(currentCountry, currentNumDays)
    }
    else{
        currentNumDays = 1;
        refreshAllData(currentCountry, currentNumDays)
    }
}

function setNextWeek() {
    if (currentNumDays + 7 < initNumdays) {
        currentNumDays = currentNumDays + 7;
        refreshAllData(currentCountry, currentNumDays)
    }
    else{
        currentNumDays = initNumdays;
        refreshAllData(currentCountry, currentNumDays)
    }
}


document.getElementById('countryInput').addEventListener('input', function () {
    var val = document.getElementById("countryInput").value;
    
    if (val) {
        currentCountry = val;
        refreshAllData(currentCountry);
    }
});

main();
