import requests, json

key = 'd195df3012a19bc5bdb52e20d1610a879240f525ba11187b61768faac562c903'

# Test Nominatim autocomplete
r = requests.get('https://nominatim.openstreetmap.org/search', params={
    'q': 'minneapolis',
    'format': 'json',
    'limit': 5,
    'addressdetails': 1,
}, headers={'User-Agent': 'ELDTripPlanner/1.0'})
print('Nominatim STATUS:', r.status_code)
for item in r.json():
    addr = item.get('address', {})
    print(' -', item.get('display_name', '')[:80], '|', item['lat'], item['lon'])
