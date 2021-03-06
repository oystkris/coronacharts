

var confirmed_dict = {};
var recovered_dict = {};
var death_dict = {};
var four_parameter_json;
var countries = [];
var currentCountry = "Norway";
var predictionPlotOn = false;
var extraDataPlotOn = false;

var initNumdays, currentNumDays;

async function main() {
    $.getJSON("./4pl.json", function(json) {
        four_parameter_json = json;
    });

    await getData();
    // updateCountryCombobox();
    await new Promise(r => setTimeout(r, 2000));

    refreshAllData(currentCountry, null);
}

async function getData() {
    data2dict(
        "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv",
        confirmed_dict
    );
    data2dict(
        "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv",
        recovered_dict
    );
    data2dict(
        "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv",
        death_dict
    );
}

function data2dict(url, dictionary){
    $(document).ready(function () {
        $.ajax({
            type: "GET",
            url: url,
            dataType: "text",
            success: function (data) {
                processData(data, dictionary);
            }
        });
    });
}

function processData(allText, dictionary) {
    var allText = allText.replace("\"Korea, South\"", "South Korea");
    var allTextLines = allText.split(/\r\n|\n/);
    var headers = allTextLines[0].split(',');
    var dates = headers.slice(Math.max(headers.length - (headers.length - 4), 1));
    var local_countries = [];

    // console.log(headers);
    // console.log(dates);

    for (var i = 1; i < allTextLines.length; i++) {

        var data = allTextLines[i].split(',');
        if (!allTextLines[i].includes("\"")) {

            var country = data[1];
            if (!(country in dictionary)) {
                dictionary[country] = {};
                local_countries.push(country);
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
    local_countries.sort();
    local_countries.forEach(function (item, index) {
        if (!countries.includes(item)){
            countries.push(item);
        }
    });
    updateCountryCombobox();
}

function updateCountryCombobox(){
    var options = '';
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

    var p_date_string = `${parameters.finalDateObj.getDate()} ${parameters.finalDateObj.toLocaleString('default', { month: 'long' })} ${parameters.finalDateObj.getFullYear()}</b>`;

    document.getElementById("country_p").innerHTML = `${parameters.country}`;
    document.getElementById("date_p").innerHTML = p_date_string;
    document.getElementById("date_select_p").innerHTML = p_date_string;

    const eq_size = "\\Large";

    var y_n = parameters.confirmedCasesTrace.y_data.slice(-1)[0];
    var y_n_1 = parameters.confirmedCasesTrace.y_data.slice(-2)[0];
    var growthFactor = y_n / y_n_1;

    var growth_factor_r2 = eq_size + '{\\frac{Δ N_d}{Δ N_{d-1}} = ' + growthFactor.toFixed(3).toString() + '}';

    var gf_eq = document.getElementById('GrowthFactorEquation');
    katex.render(growth_factor_r2, gf_eq, {
        throwOnError: false
    });


    exponential_r2 = eq_size + '{r^2 = ' + parameters.exponentialTrace.r2.toFixed(4).toString() + '}';
    exponential_eq = eq_size + '{y = ' + parameters.exponentialTrace.a.toFixed(2).toString() + '\\;e^{\\:' + parameters.exponentialTrace.b.toFixed(2).toString() + 'x}}';

    var exp_r2_eq = document.getElementById('ExponentialR2');
    katex.render(exponential_r2, exp_r2_eq, {
        throwOnError: false
    });

    var exp_eq = document.getElementById('ExponentialEquation');
    katex.render(exponential_eq, exp_eq, {
        throwOnError: false
    });

    document.getElementById("inflectionDate").innerHTML = `<i>inflection point</i><br><b>${parameters.logisticTrace.dateCpoint.getDate()} ${parameters.logisticTrace.dateCpoint.toLocaleString('default', { month: 'long' })} ${parameters.logisticTrace.dateCpoint.getFullYear()}</b>`;
    document.getElementById("percent98Date").innerHTML = `<i>reaching 98% cases at</i><br><b>${parameters.logisticTrace.date98percent.getDate()} ${parameters.logisticTrace.date98percent.toLocaleString('default', { month: 'long' })} ${parameters.logisticTrace.date98percent.getFullYear()}</b>`;

    var logistic_r2 = eq_size + '{r^2 = ' + parameters.logisticTrace.r2.toFixed(4).toString() + '}';
    var logistic_eq = eq_size + '{y = ' + parameters.logisticTrace.d.toFixed(2).toString() + ' + \\frac{' + parameters.logisticTrace.a.toFixed(2).toString() + ' - ' + parameters.logisticTrace.d.toFixed(2).toString() + '}{1 + (\\frac{x}{' + parameters.logisticTrace.c.toFixed(2).toString() + '})^{' + parameters.logisticTrace.b.toFixed(2).toString() + '}}}';
    // console.log(logistic_eq);

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

    var x_data_label = $.map(confirmed_dict[country], function (value, key) { return key });
    x_data_label.sort(function(a,b){
        return dateToDateObj(a) - dateToDateObj(b);
    });
    console.log(x_data_label);

    initNumdays = x_data_label.length;
    if (!numDays) {
        currentNumDays = initNumdays;
    }

    var confirmedCasesTrace = getConfirmedCasesTrace(x_data_label, country, numDays, confirmed_dict);
    var recoveredTrace = getConfirmedCasesTrace(x_data_label, country, numDays, recovered_dict);
    var deathTrace = getConfirmedCasesTrace(x_data_label, country, numDays, death_dict);
    var final_date = confirmedCasesTrace.x_data.slice(-1)[0];
    var final_confirmed = confirmedCasesTrace.y_data.slice(-1)[0];
    var date = dateToDateObj(final_date);
    console.log(final_date);

    var day = date.getDate();
    var month = date.toLocaleString('default', { month: 'long' });

    var exponentialTrace = getExponentialTrace(confirmedCasesTrace.x_data, confirmedCasesTrace.y_data);
    var logisticTrace = getLogisticTrace(confirmedCasesTrace.x_data, confirmedCasesTrace.y_data, country, final_date);

    var alpha = 0.2;
    var data_traces = [];

    var trace1 = {
        x: confirmedCasesTrace.x_data,
        y: confirmedCasesTrace.y_data,
        name: 'Confirmed cases',
        type: 'bar',
        marker: {
            color: 'rgb(0, 0, 0)',
        }
    };

    var trace_gf = {
        x: confirmedCasesTrace.x_data,
        y: confirmedCasesTrace.y_data_growth,
        name: 'Growth Factor',
        type: 'scatter',
        line: {
            color: 'rgb(148, 103, 189)',
            width: 8,
            shape: 'spline',
            dash: 'dot'
        },
        yaxis: 'y2'
    };

    data_traces = [trace1, trace_gf];

    if (extraDataPlotOn == true){
        var y_data_finished = recoveredTrace.y_data.map(function(v,i) { return (v + deathTrace.y_data[i]); });
        var y_data_active = confirmedCasesTrace.y_data.map(function(v,i) { return (v - y_data_finished[i]); });
        var trace_recovered = {
            x: recoveredTrace.x_data,
            y: recoveredTrace.y_data,
            name: 'recovered',
            type: 'scatter',
            line: {
                color: 'rgb(44, 160, 44)',
                width: 4
            }
        };
    
        var trace_death = {
            x: deathTrace.x_data,
            y: deathTrace.y_data,
            name: 'died',
            type: 'scatter',
            line: {
                color: 'rgb(127, 127, 127)',
                width: 4
            }
        };

        var trace_active = {
            x: confirmedCasesTrace.x_data,
            y: y_data_active,
            name: 'active cases',
            type: 'scatter',
            line: {
                color: 'rgb(221, 175, 39)',
                width: 4
            }
        };

        data_traces.push(trace_recovered);
        data_traces.push(trace_death);
        data_traces.push(trace_active);
    }

    var trace_exp = {
        x: exponentialTrace.x_data,
        y: exponentialTrace.y_data,
        name: 'exponential',
        type: 'scatter',
        line: {
            color: 'rgb(219, 64, 82)',
            width: 5
        }
    };
    data_traces.push(trace_exp);
    
        
    if (logisticTrace.x_data != null) {

        var trace_logistic_error_l = {
            x: logisticTrace.x_data,
            y: logisticTrace.y_data_lower,
            name: 'logistic error lower',
            type: 'scatter',
            showlegend: false,
            hoverinfo: 'none',
            // fill: "tonexty",
            fillcolor:`rgba(55, 128, 191, ${alpha})`,
            line: {
                width: 0
            }
        };

        var trace_logistic_error_u = {
            x: logisticTrace.x_data,
            y: logisticTrace.y_data_upper,
            name: 'logistic error upper',
            type: 'scatter',
            showlegend: false,
            hoverinfo: 'none',
            fill: "tonexty",
            fillcolor:`rgba(55, 128, 191, ${alpha})`,
            line: {
                width: 0
            }
        };

        var trace_logistic = {
            x: logisticTrace.x_data,
            y: logisticTrace.y_data,
            name: 'logistic',
            type: 'scatter',
            // fill: "tonexty",
            line: {
                color: 'rgb(55, 128, 191)',
                width: 8
            }
        };
        
        data_traces.push(trace_logistic_error_l);
        data_traces.push(trace_logistic_error_u);
        data_traces.push(trace_logistic);


        if (predictionPlotOn == true)
        {
            var trace_logistic_pred_error_l = {
                x: logisticTrace.x_data,
                y: logisticTrace.y_data_predict_lower,
                name: 'logistic error lower',
                type: 'scatter',
                showlegend: false,
                hoverinfo: 'none',
                // fill: "tonexty",
                fillcolor:`rgba(192,192,192, ${alpha})`,
                line: {
                    width: 0
                }
            };
    
            var trace_logistic_pred_error_u = {
                x: logisticTrace.x_data,
                y: logisticTrace.y_data_predict_upper,
                name: 'logistic error upper',
                type: 'scatter',
                showlegend: false,
                hoverinfo: 'none',
                fill: "tonexty",
                fillcolor:`rgba(192,192,192, ${alpha})`,
                line: {
                    width: 0
                }
            };

            var trace_logistic_pred = {
                x: logisticTrace.x_data_predict,
                y: logisticTrace.y_data_predict,
                name: 'logistic prediction',
                type: 'scatter',
                line: {
                    color: 'darkgrey',
                    width: 5,
                    dash:'dash'
                }
            };

            data_traces.push(trace_logistic_pred_error_l);
            data_traces.push(trace_logistic_pred_error_u);
            data_traces.push(trace_logistic_pred);
        }
    }

    var plot_title = `<b>Cases of Covid-19 in ${country}</b>`;
    if (logisticTrace.x_data != null) {
        plot_title = plot_title + `<br>Prediction logistic model: maximum <b>${logisticTrace.d.toFixed(0)}</b> confirmed cases`;
    }
    plot_title = plot_title + `<br><sup><i>Confirmed cases as of ${day} ${month} ${date.getFullYear()}: <b>${final_confirmed}</b></i></sup>`;
    plot_title = plot_title + '<br><sup><i>See model parameters in sidebar</i></sup>';

    if (logisticTrace.x_data != null) {
        var max_error_value = Math.ceil(logisticTrace.y_data_upper[logisticTrace.y_data_upper.length - 1]) + 10;
        var max_logistic_value = Math.ceil(logisticTrace.y_data[logisticTrace.y_data.length - 1]) + 10;
        var max_y_value = Math.ceil(confirmedCasesTrace.y_data[confirmedCasesTrace.y_data.length - 1]) + 10;
        var max_exp_value = Math.ceil(exponentialTrace.y_data[exponentialTrace.y_data.length - 1]) + 10;
        var max_predict = Math.ceil(logisticTrace.y_data_predict[logisticTrace.y_data_predict.length - 1]) + 50;
        var max_predict_error = Math.ceil(logisticTrace.y_data_predict_upper[logisticTrace.y_data_predict_upper.length - 1]) + 50;
        var max_y_axis;

        if (!predictionPlotOn){
            if (max_error_value > 2 * max_y_value){
                max_y_axis = 2 * max_y_value;
            }
            else{
                max_y_axis = Math.max(max_error_value, max_logistic_value, max_y_value, max_exp_value);
            }
        }
        else{
            if (max_predict_error > 2 * max_predict){
                max_y_axis = 2 * max_predict;
            }
            else{
                max_y_axis = max_predict_error;
            }
        }
    }
    else{
        max_y_axis = max_y_value;
    }
    
    var layout = {
        title: {
            text: plot_title,
            font: {
                family: 'Courier New, monospace',
                size: 24
            },
            xanchor: 'left',
            yanchor: 'top',
            xref: 'paper',
            x: 0.05,
        },
        yaxis: {
            title: '<b>Confirmed Cases</b>',
            range: [0, max_y_axis],
            side: 'right'
        },
        yaxis2: {
          title: '<b>Growth Factor</b>',
          overlaying: 'y',
          range: [0, 3],
          showgrid: false,
          side: 'left'
        },
        showlegend: true,
        legend: {
            x: 0.18,
            xanchor: 'right',
            y: 0.9
        },
        width: 1475,
        height: 855,
        bargap: 20.0
    };

    Plotly.newPlot('mainPlot', data_traces, layout);

    return{
        confirmedCasesTrace,
        exponentialTrace,
        logisticTrace,
        country,
        finalDateObj: date
    };
}

function getLogisticTrace(x_data, confirmed_y_data, country, finalDate){

    var log_point_list = [];
    var log_lower_point_list = [];
    var lginf = four_parameter_json[country][finalDate];

    if (lginf != null){
        var x_data_index = [];
        var logistic_y_data = [];
    
        x_data.forEach(function (item, index) {
            x_data_index.push(index);
        });

        var data_index;
        var logistic_y;
        var y_data_lower = [];
        var y_data_upper = [];
        x_data_index.forEach(function (x, index) {
            logistic_y = logistic(x, lginf.A, lginf.B, lginf.C, lginf.D);
            logistic_y_lower = logistic(x, lginf.A_l, lginf.B_l, lginf.C_l, lginf.D_l);
            logistic_y_upper = logistic(x, lginf.A_u, lginf.B_u, lginf.C_u, lginf.D_u);
            logistic_y_data.push(logistic_y);
            y_data_lower.push(logistic_y_lower);
            y_data_upper.push(logistic_y_upper);
            log_point_list.push([x, logistic_y]);
            log_lower_point_list.push([x, logistic_y_lower])
            data_index = index;
        });

        var r2 = determinationCoefficient(x_data, confirmed_y_data, log_point_list);
        var r2_lower = determinationCoefficient(x_data, confirmed_y_data, log_lower_point_list);

        var finalDateObj = dateToDateObj(finalDate);
        var finalConfirmed = confirmed_y_data.slice(-1)[0];
        var predictionLimit = Math.ceil(lginf.D * 0.98);

        x_data_predict_index = x_data_index;
        x_data_predict = x_data;
        y_data_predict = [];
        y_data_predict_lower = [];
        y_data_predict_upper = [];

        var dateCpoint = null;

        x_data.forEach(function (item, index) {
            y_data_predict.push(null);
            y_data_predict_lower.push(null);
            y_data_predict_upper.push(null);
            if (dateCpoint == null){
                if (index > lginf.C){
                    dateCpoint = dateToDateObj(item);
                    dateCpoint = new Date(dateCpoint.setDate(dateCpoint.getDate() - 1));
                }
            }
        });

        y_data_predict.splice(-1,1);
        y_data_predict_lower.splice(-1,1);
        y_data_predict_upper.splice(-1,1);
        y_data_predict.push(logistic(data_index, lginf.A, lginf.B, lginf.C, lginf.D));
        y_data_predict_lower.push(logistic(data_index, lginf.A_l, lginf.B_l, lginf.C_l, lginf.D_l));
        y_data_predict_upper.push(logistic(data_index, lginf.A_u, lginf.B_u, lginf.C_u, lginf.D_u));

        logistic_y = 0;
        var nextDate = finalDateObj;
        var label = "";

        while (logistic_y < predictionLimit) {
            data_index = data_index + 1;
            if (dateCpoint == null){
                if (data_index > lginf.C){
                    dateCpoint = dateToDateObj(finalDate);
                    dateCpoint = new Date(dateCpoint.setDate(dateCpoint.getDate() - 1));
                }
            }
            
            nextDate.setDate(nextDate.getDate() + 1);
            label = dateObjDateStr(nextDate);

            logistic_y = logistic(data_index, lginf.A, lginf.B, lginf.C, lginf.D);
            logistic_y_lower = logistic(data_index, lginf.A_l, lginf.B_l, lginf.C_l, lginf.D_l);
            logistic_y_upper = logistic(data_index, lginf.A_u, lginf.B_u, lginf.C_u, lginf.D_u);
            x_data_predict_index.push(data_index);
            x_data_predict.push(label);
            y_data_predict.push(logistic_y);
            y_data_predict_lower.push(logistic_y_lower)
            y_data_predict_upper.push(logistic_y_upper);

            if (data_index > 28835){
                break;
            }
        }

        if (dateCpoint == null){
            dateCpoint = finalDateObj;
        }

        return{
            x_data,
            y_data: logistic_y_data,
            y_data_lower,
            y_data_upper,
            x_data_predict,
            y_data_predict,
            y_data_predict_lower,
            y_data_predict_upper,
            a: lginf.A,
            b: lginf.B, 
            c: lginf.C, 
            d: lginf.D,
            r2,
            r2_lower,
            dateCpoint,
            date98percent: nextDate
        }
    }
    else{
        return{
            x_data: null
        }
    }
}

function getConfirmedCasesTrace(x_data_label, country, numDays, dictionary){

    var y_data_growth = [];


    // leave only days from 0 - numDays
    var x_data = x_data_label
    if (numDays) {
        x_data = x_data_label.slice(0, numDays);
    }

    var cur_y;
    var prev_y = null;
    var growth_factor;

    var y_data = [];
    x_data.forEach(function (item, index) {
        if (item in dictionary[country]) {
            cur_y = dictionary[country][item];
            y_data.push(cur_y);
            if (prev_y == null){
                y_data_growth.push(null);
            }
            else{
                growth_factor = cur_y / prev_y;
                if (cur_y > 52){
                    y_data_growth.push(growth_factor);
                }
                else{
                    y_data_growth.push(null);
                }
            }
            prev_y = cur_y;
        }
        else{
            y_data.push(null);
        }
    });

    return{
        x_data,
        y_data,
        y_data_growth
    }
}

function getExponentialTrace(x_data, confirmed_y_data){
    var x_data_index = [];
    var y_data = [];

    x_data.forEach(function (item, index) {
        x_data_index.push(index)
    });

    var exp_info = getExponentialConstants(x_data_index, confirmed_y_data, 10);

    x_data_index.forEach(function (item, index) {
        y_data.push(exponential(item, exp_info.a, exp_info.b));
    });

    var r2 = determinationCoefficient(x_data_index, confirmed_y_data, exp_info.points);

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

function dateToDateObj(dateString){
    var arr = dateString.split('/');
    var isoString = "20" + arr[2] + "-" + arr[0] + "-" + arr[1] + "";
    return new Date(isoString);
}

function dateObjDateStr(dateObj){
    var year = dateObj.getFullYear().toString().slice(-2);;
    var month = dateObj.getMonth() + 1;
    var day = dateObj.getDate();
    return month + "/" + day + "/" + year;
}

function togglePredictionPlot(){
    if(predictionPlotOn == false){
        predictionPlotOn = true;
    }
    else{
        predictionPlotOn = false;
    }
    refreshAllData(currentCountry, currentNumDays);
}

function toggleExtraDataPlot(){
    if(extraDataPlotOn == false){
        extraDataPlotOn = true;
        document.getElementById('extraDataPlot').innerHTML = "Plot less data";
    }
    else{
        extraDataPlotOn = false;
        document.getElementById('extraDataPlot').innerHTML = "Plot more data";
    }
    refreshAllData(currentCountry, currentNumDays);
}

function setPreviousDay() {
    if (currentNumDays > 0) {
        currentNumDays--;
        refreshAllData(currentCountry, currentNumDays);
    }
}

function setNextDay() {
    if (currentNumDays < initNumdays) {
        currentNumDays++;
        refreshAllData(currentCountry, currentNumDays);
    }
}

function setPreviousWeek(){
    if (currentNumDays - 7 > 0) {
        currentNumDays = currentNumDays - 7;
        refreshAllData(currentCountry, currentNumDays);
    }
    else{
        currentNumDays = 1;
        refreshAllData(currentCountry, currentNumDays);
    }
}

function setNextWeek() {
    if (currentNumDays + 7 < initNumdays) {
        currentNumDays = currentNumDays + 7;
        refreshAllData(currentCountry, currentNumDays);
    }
    else{
        currentNumDays = initNumdays;
        refreshAllData(currentCountry, currentNumDays);
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
