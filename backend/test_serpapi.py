import requests, json

key = 'd195df3012a19bc5bdb52e20d1610a879240f525ba11187b61768faac562c903'

# Test google_maps_autocomplete with a default ll center
r = requests.get('https://serpapi.com/search', params={
    'engine': 'google_maps_autocomplete',
    'q': 'minneapolis',
    'll': '@39.5,-98.35,4z',  # center of USA, zoomed out
    'api_key': key,
})
print('STATUS:', r.status_code)
data = r.json()
for s in data.get('suggestions', [])[:5]:
    print(' -', s.get('value'), '|', s.get('latitude'), s.get('longitude'), '|', s.get('subtext',''))
