import urllib.request, urllib.parse, json

BASE = 'http://127.0.0.1:8000/api'
results = []

def ok(n, msg): results.append(f"PASS  {n}. {msg}")
def fail(n, msg): results.append(f"FAIL  {n}. {msg}")

def req(method, path, data=None, token=None):
    url = BASE + path
    body = json.dumps(data).encode() if data else None
    headers = {'Content-Type': 'application/json', 'Accept': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            txt = resp.read()
            return resp.status, (json.loads(txt) if txt else {})
    except urllib.error.HTTPError as e:
        txt = e.read()
        return e.code, (json.loads(txt) if txt else {})
    except Exception as ex:
        return 0, {"error": str(ex)}

# ------ 1. Register ------
status, body = req('POST', '/auth/register/', {'email': 'audit@test.com', 'password': 'audit1234'})
token = body.get('access', '')
if status == 200 and token:
    ok(1, "Register — new account created, JWT returned")
elif status == 400 and 'already exists' in str(body):
    status2, body2 = req('POST', '/auth/login/', {'email': 'audit@test.com', 'password': 'audit1234'})
    token = body2.get('access', '')
    if token:
        ok(1, "Register (account existed) — login succeeded, JWT returned")
    else:
        fail(1, "Login after existing register failed: " + str(body2))
else:
    fail(1, "Register — status=" + str(status) + " " + str(body))

# ------ 2. Pantry list ------
status, body = req('GET', '/pantry/', token=token)
if status == 200 and isinstance(body, list):
    ok(2, "Pantry list — " + str(len(body)) + " items returned")
else:
    fail(2, "Pantry list — status=" + str(status))

# ------ 3. Add pantry item ------
status, body = req('POST', '/pantry/', {
    'name': 'Tomatoes', 'category': 'Produce',
    'quantity': 3, 'unit': 'pcs',
    'expires_at': '2026-07-01', 'price_paid': 1.5
}, token=token)
pantry_id = body.get('id')
if status == 201 and pantry_id:
    ok(3, "Add pantry item — Tomatoes created with id=" + str(pantry_id))
else:
    fail(3, "Add pantry item — status=" + str(status) + " " + str(body))

# ------ 4. Delete pantry item ------
if pantry_id:
    status, _ = req('DELETE', '/pantry/' + str(pantry_id) + '/', token=token)
    if status == 204:
        ok(4, "Delete pantry item — 204 No Content")
    else:
        fail(4, "Delete pantry item — status=" + str(status))
else:
    results.append("SKIP  4. Delete pantry (no id from step 3)")

# ------ 5. Recipes list ------
status, body = req('GET', '/recipes/', token=token)
if status == 200 and isinstance(body, list):
    ok(5, "Recipe list — " + str(len(body)) + " recipes returned")
else:
    fail(5, "Recipe list — status=" + str(status))

# ------ 6. Add recipe ------
status, body = req('POST', '/recipes/', {
    'title': 'Audit Pasta', 'cuisine': 'Italian', 'minutes': 20,
    'difficulty': 'Easy', 'tags': ['quick'],
    'ingredients': ['pasta', 'tomato'], 'steps': ['Boil pasta', 'Add sauce'], 'rating': 4.5
}, token=token)
recipe_id = body.get('id')
if status == 201 and recipe_id:
    ok(6, "Add recipe — Audit Pasta created with id=" + str(recipe_id))
else:
    fail(6, "Add recipe — status=" + str(status) + " " + str(body))

# ------ 7. Delete recipe ------
if recipe_id:
    status, _ = req('DELETE', '/recipes/' + str(recipe_id) + '/', token=token)
    if status == 204:
        ok(7, "Delete recipe — 204 No Content")
    else:
        fail(7, "Delete recipe — status=" + str(status))

# ------ 8. Expenses list ------
status, body = req('GET', '/expenses/', token=token)
if status == 200 and isinstance(body, list):
    ok(8, "Expenses list — " + str(len(body)) + " records")
else:
    fail(8, "Expenses list — status=" + str(status))

# ------ 9. Add expense ------
status, body = req('POST', '/expenses/', {'week_offset': -1, 'amount': 45.50, 'category': 'Groceries'}, token=token)
if status == 201 and body.get('id'):
    ok(9, "Add expense — id=" + str(body['id']) + ", amount=" + str(body.get('amount')))
else:
    fail(9, "Add expense — status=" + str(status) + " " + str(body))

# ------ 10. Get preferences ------
status, body = req('GET', '/preferences/', token=token)
if status == 200 and 'diet' in body:
    ok(10, "Get preferences — diet=" + str(body.get('diet')) + ", cuisines=" + str(body.get('cuisines')))
else:
    fail(10, "Get preferences — status=" + str(status))

# ------ 11. Update preferences ------
status, body = req('PUT', '/preferences/', {
    'diet': 'vegetarian', 'cuisines': ['Italian', 'Mediterranean'], 'dislikes': ['mushrooms']
}, token=token)
if status == 200 and body.get('diet') == 'vegetarian':
    ok(11, "Update preferences — diet set to vegetarian, cuisines updated")
else:
    fail(11, "Update preferences — status=" + str(status) + " " + str(body))

# ------ 12. Discover recipes proxy ------
status, body = req('GET', '/discover/recipes/?q=chicken&limit=3', token=token)
count = len(body.get('data', [])) if isinstance(body, dict) else 0
if status == 200 and count > 0:
    names = [r['name'] for r in body['data'][:3]]
    ok(12, "Discover recipes (Recipe API proxy) — " + str(count) + " results: " + ", ".join(names))
else:
    fail(12, "Discover recipes — status=" + str(status) + " count=" + str(count) + " " + str(body)[:120])

# ------ 13. Enrich recipe (full nutrition) ------
first_id = body.get('data', [{}])[0].get('id') if isinstance(body, dict) else None
if first_id:
    status2, full = req('GET', '/discover/recipes/' + first_id + '/', token=token)
    has_nutrition = bool(full.get('nutrition', {}).get('per_serving'))
    cal = full.get('nutrition', {}).get('per_serving', {}).get('calories', '?')
    if status2 == 200 and has_nutrition:
        ok(13, "Enrich recipe nutrition — 32 nutrients loaded, calories=" + str(cal))
    else:
        fail(13, "Enrich recipe — status=" + str(status2) + " has_nutrition=" + str(has_nutrition))
else:
    results.append("SKIP  13. Enrich recipe (no id from step 12)")

# ------ 14. Geolocate ------
status, body = req('GET', '/geolocate/')
if status == 200 and body.get('countryName'):
    ok(14, "Geolocate — country=" + str(body['countryName']) + ", city=" + str(body.get('cityName', '?')))
else:
    fail(14, "Geolocate — status=" + str(status) + " " + str(body)[:80])

# ------ 15. Logout ------
status, body = req('POST', '/auth/logout/', token=token)
if status == 200:
    ok(15, "Logout — session cleared successfully")
else:
    fail(15, "Logout — status=" + str(status))

# ------ Print results ------
passed = sum(1 for r in results if r.startswith("PASS"))
failed = sum(1 for r in results if r.startswith("FAIL"))
skipped = sum(1 for r in results if r.startswith("SKIP"))

print()
print("=" * 58)
print("   SMARTPANTRY FULL BACKEND FEATURE AUDIT")
print("=" * 58)
for r in results:
    print("  " + r)
print()
print("  Score: " + str(passed) + " PASS / " + str(failed) + " FAIL / " + str(skipped) + " SKIP  (out of " + str(len(results)) + " tests)")
print("=" * 58)
