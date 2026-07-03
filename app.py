from flask import Flask, render_template, jsonify
import requests
from datetime import datetime
from scipy.stats import norm
import statistics
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

def get_meteomatics_data(url):
    username = os.getenv("METEOMATICS_USERNAME")
    password = os.getenv("METEOMATICS_PASSWORD")
    try:
        # Increased timeout to 30s because we are fetching more data at once
        response = requests.get(url, auth=(username, password), timeout=30)
        if response.status_code != 200:
            print(f"Meteomatics Error ({response.status_code}): {response.text}")
        response.raise_for_status()
        return response.json(), 200
    except Exception as e:
        print(f"Request Exception: {str(e)}")
        return {"error": str(e)}, 500

def simplify_list(param_data):
    try:
        values = param_data["coordinates"][0]["dates"]
        return [{"time": datetime.fromisoformat(v["date"].replace("Z", "+00:00")).strftime("%H:%M"), 
                 "value": round(v["value"], 2)} for v in values]
    except:
        return []

@app.route("/")
def index():
    return render_template("index.html")

@app.get('/api/full-weather/<date>/<time>/<lat>/<long>')
def get_full_weather(date, time, lat, long):
    # One single URL for ALL parameters
    # Using precip_1h and sunshine_1h because they are more reliable for 'today' requests
    params = "t_2m:C,wind_speed_10m:ms,precip_1h:mm,sunshine_duration_1h:h,msl_pressure:hPa,absolute_humidity_2m:gm3"
    url = f"https://api.meteomatics.com/{date}T00:00:00Z--{date}T23:59:59Z:PT1H/{params}/{lat},{long}/json"
    
    data, status = get_meteomatics_data(url)
    if status != 200:
        return jsonify(data), status

    organized_graphs = {}
    current_values = {}

    for param in data.get('data', []):
        name = param['parameter']
        simplified = simplify_list(param)
        organized_graphs[name] = simplified
        
        # Try to find the value closest to the selected time
        if simplified:
            # Default to the most recent value
            current_values[name] = simplified[-1]["value"]
            for entry in simplified:
                if entry["time"][:2] == time[:2]: # Match the hour
                    current_values[name] = entry["value"]
                    break

    # Calculate Probability / Risk Score
    # We use the hourly lists for stats
    try:
        temps = [d['value'] for d in organized_graphs.get('t_2m:C', [])]
        winds = [d['value'] for d in organized_graphs.get('wind_speed_10m:ms', [])]
        rains = [d['value'] for d in organized_graphs.get('precip_1h:mm', [])]

        def calc_prob(vals, thresh, higher=True):
            if len(vals) < 2: return 0
            m, s = sum(vals)/len(vals), statistics.stdev(vals)
            if s == 0: return 100 if (m > thresh if higher else m < thresh) else 0
            z = (thresh - m) / s
            p = 1 - norm.cdf(z) if higher else norm.cdf(z)
            return round(p * 100, 2)

        p_hot = calc_prob(temps, 25, True)
        p_cold = calc_prob(temps, 7, False)
        p_wind = calc_prob(winds, 7, True)
        p_wet = calc_prob(rains, 2, True) # lower threshold for 1h precip

        risk = max(p_hot, p_cold, p_wind, p_wet)
        
        return jsonify({
            "graphs": organized_graphs,
            "current": current_values,
            "risk": {
                "very_hot": f"{p_hot}%", "very_cold": f"{p_cold}%",
                "very_windy": f"{p_wind}%", "very_wet": f"{p_wet}%",
                "risk_score": f"{risk}%", "comfort_score": f"{100-risk}%"
            }
        })
    except Exception as e:
        return jsonify({"error": f"Stat processing failed: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))
