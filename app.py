from flask import Flask, render_template, jsonify, request
import requests
from datetime import datetime
from scipy.stats import norm
import statistics
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Helper function to handle API calls safely
def get_meteomatics_data(url):
    username = os.getenv("METEOMATICS_USERNAME")
    password = os.getenv("METEOMATICS_PASSWORD")
    
    if not username or not password:
        return {"error": "API credentials missing from environment"}, 500

    try:
        response = requests.get(url, auth=(username, password), timeout=15)
        response.raise_for_status()  # Trigger error if status is not 200
        return response.json(), 200
    except requests.exceptions.Timeout:
        return {"error": "Weather API timed out"}, 504
    except requests.exceptions.RequestException as e:
        return {"error": f"Weather API error: {str(e)}"}, 502

def simplify_list(data):
    try:
        # Check if structure is valid
        if not data or "data" not in data or not data["data"]:
            return []
            
        values = data["data"][0]["coordinates"][0]["dates"]
        simplified = []
        for v in values:
            dt = datetime.fromisoformat(v["date"].replace("Z", "+00:00"))
            time_str = dt.strftime("%H:%M")
            simplified.append({
                "time": time_str,
                "value": round(v["value"], 2) 
            })
        return simplified
    except (KeyError, IndexError, ValueError, TypeError):
        return []

@app.route("/")
def index():
    return render_template("index.html")

@app.get('/api/weather-prediction/<date>/<time>/<lat>/<long>')
def weather_prediction(date, time, lat, long):
    url = f"https://api.meteomatics.com/{date}T00:00:00Z--{date}T23:59:59Z:PT30M/t_2m:C,wind_speed_10m:ms,precip_24h:mm/{lat},{long}/json"
    
    data, status = get_meteomatics_data(url)
    if status != 200:
        return jsonify(data), status

    try:
        organized = {}
        for parameter in data["data"]:
            param_name = parameter["parameter"]
            coord = parameter["coordinates"][0]
            values = [entry["value"] for entry in coord["dates"]]
            organized[param_name] = values
        
        # Calculate stats safely
        def get_prob(values, threshold, is_higher=True):
            if len(values) < 2: return 0
            avg = sum(values) / len(values)
            dev = statistics.stdev(values)
            if dev == 0: return 100 if (avg > threshold if is_higher else avg < threshold) else 0
            z = (threshold - avg) / dev
            area = 1 - norm.cdf(z) if is_higher else norm.cdf(z)
            return round(area * 100, 2)

        prob_hot = get_prob(organized.get('t_2m:C', []), 25, True)
        prob_cold = get_prob(organized.get('t_2m:C', []), 7, False)
        prob_wind = get_prob(organized.get('wind_speed_10m:ms', []), 7, True)
        prob_wet = get_prob(organized.get('precip_24h:mm', []), 10, True)

        risk_score = max(prob_hot, prob_cold, prob_wind, prob_wet)
        comfort_score = 100 - risk_score

        return jsonify({'data': {
            'very_hot': f"{prob_hot}%", 
            'very_cold': f"{prob_cold}%", 
            'very_windy': f"{prob_wind}%", 
            'very_wet': f"{prob_wet}%",
            'risk_score': f"{risk_score}%", 
            'comfort_score': f"{comfort_score}%"
        }}), 200
    except Exception as e:
        return jsonify({"error": f"Processing error: {str(e)}"}), 500

@app.get('/api/current-data/<date>/<time>/<lat>/<long>')
def get_current_data(date, time, lat, long):
    url = f'https://api.meteomatics.com/{date}T{time}:00Z/t_2m:C,wind_speed_10m:ms,precip_24h:mm,msl_pressure:hPa,absolute_humidity_2m:gm3/{lat},{long}/json'
    data, status = get_meteomatics_data(url)
    if status != 200:
        return jsonify(data), status
    
    result = {}
    for param in data.get('data', []):
        name = param['parameter']
        val = param['coordinates'][0]['dates'][0]['value']
        result[name] = val
    return jsonify(result)

@app.get('/api/rainfall_chart/<date>/<lat>/<long>')
def rainfall_graph(date, lat, long):
    url = f"https://api.meteomatics.com/{date}T00:00:00Z--{date}T23:59:59Z:PT30M/precip_24h:mm/{lat},{long}/json"
    data, status = get_meteomatics_data(url)
    simplified = simplify_list(data)
    return jsonify({"x": [d['time'] for d in simplified], "y": [d['value'] for d in simplified]})

@app.get('/api/sunshine-data/<date>/<lat>/<long>')
def sunshine_graph(date, lat, long):
    url = f"https://api.meteomatics.com/{date}T00:00:00Z--{date}T23:59:59Z:PT1H/sunshine_duration_1h:h/{lat},{long}/json"
    data, status = get_meteomatics_data(url)
    simplified = simplify_list(data)
    return jsonify({"x": [d['time'] for d in simplified], "y": [d['value'] for d in simplified]})

@app.get('/api/temp-data/<date>/<lat>/<long>')
def temp_graph(date, lat, long):
    url = f"https://api.meteomatics.com/{date}T00:00:00Z--{date}T23:59:59Z:PT30M/t_2m:C/{lat},{long}/json"
    data, status = get_meteomatics_data(url)
    simplified = simplify_list(data)
    return jsonify({"x": [d['time'] for d in simplified], "y": [d['value'] for d in simplified]})

@app.get('/api/wind-data/<date>/<lat>/<long>')
def wind_graph(date, lat, long):
    url = f"https://api.meteomatics.com/{date}T00:00:00Z--{date}T23:59:59Z:PT30M/wind_speed_10m:ms/{lat},{long}/json"
    data, status = get_meteomatics_data(url)
    simplified = simplify_list(data)
    return jsonify({"x": [d['time'] for d in simplified], "y": [d['value'] for d in simplified]})

if __name__ == '__main__':
    # On Render, the port is handled by Gunicorn, but this remains for local testing
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))
