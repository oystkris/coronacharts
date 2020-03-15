

var dictionary = {};

async function main() {
    await getData();
    await new Promise(r => setTimeout(r, 2000));
    plotData("Norway");
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
}

async function plotData(country, index) {

    await getData();

    console.log("dict:")

    console.log(dictionary)

    console.log(country)
    console.log(dictionary[country])

    var x_data_label = $.map(dictionary[country], function (value, key) { return key });
    var x_data_index = []
    var y_data = $.map(dictionary[country], function (value, key) { return value });

    var exp_y_data = [];

    var point_list = [];
    x_data_label.forEach(function (item, index) {
        x_data_index.push(index)
        point = [index, y_data[index]];
        point_list.push(point);
    });

    var exp_info = getExponentialConstants(point_list, 10)

    x_data_index.forEach(function (item, index) {
        exp_y_data.push(exponential(item, exp_info.a, exp_info.b));
    });

    var r2 = determinationCoefficient(point_list, exp_info.points)
    // var r2_rounded = Math.round((r2 + Number.EPSILON) * 100) / 100

    var plot_title = `Cases of Covid-19 in ${country}. \nExponential fit: ${exp_info.a.toFixed(2)}e^${exp_info.b.toFixed(2)} x \nR^2 = ${r2.toFixed(3)}`

    // var plot_title = '$${exp_info.a.toFixed(2)}e^{${exp_info.b.toFixed(2)} x}$'

    var trace1 = {
        x: x_data_label,
        y: y_data,
        name: 'Confirmed cases',
        type: 'scatter'
    };

    var trace2 = {
        x: x_data_label,
        y: exp_y_data,
        name: '$ae^{bx}$',
        type: 'scatter'
    };

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
        height: 900,
        yaxis2: {
            domain: [0.6, 0.95],
            anchor: "x2"
        },
        xaxis2: {
            domain: [0.6, 0.95],
            anchor: "y2"
        }
    };

    var data = [trace1, trace2];

    Plotly.newPlot('myDiv', data, layout);

}

function exponential(x, a, b) {
    return a * Math.exp(b * x);
}

function getExponentialConstants(data, precision) {
    // https://github.com/Tom-Alexander/regression-js/blob/master/src/regression.js
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
        equation: [coeffA, coeffB],
        string: `y = ${a.toFixed(2)}e^(${b.toFixed(2)}x)`
        // r2: Math.round(determinationCoefficient(data, points), precision),
    };
}

function determinationCoefficient(data, results) {
    // https://github.com/Tom-Alexander/regression-js/blob/master/src/regression.js
    const predictions = [];
    const observations = [];

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

main();
