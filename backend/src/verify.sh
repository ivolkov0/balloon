BASE=http://localhost:8080
PASS=0; FAIL=0
check() { # $1=desc $2=expected $3=actual
  if [ "$2" = "$3" ]; then echo "OK   $1 ($3)"; PASS=$((PASS+1));
  else echo "FAIL $1 expected=$2 got=$3"; FAIL=$((FAIL+1)); fi
}

echo "=== 1. Анонимный доступ ==="
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/user)
check "GET /api/user без токена → 401" 401 "$code"

code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/round/1/state)
check "GET /api/round/1/state без токена → 401" 401 "$code"

code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/history)
check "GET /api/history без токена → 401" 401 "$code"

code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/swagger-ui.html)
check "GET /swagger-ui.html → 200/302" "$code" "$code"   # просто что не 401
if [ "$code" = "401" ]; then echo "FAIL swagger закрыт"; fi

echo
echo "=== 2. Guest-сессии ==="
GUEST1=$(curl -s -X POST $BASE/api/auth/guest)
GUEST2=$(curl -s -X POST $BASE/api/auth/guest)
T1=$(echo "$GUEST1" | jq -r .token)
T2=$(echo "$GUEST2" | jq -r .token)
U1=$(echo "$GUEST1" | jq -r .userId)
U2=$(echo "$GUEST2" | jq -r .userId)
echo "T1=$T1 (user=$U1)"
echo "T2=$T2 (user=$U2)"
[ "$T1" != "$T2" ] && echo "OK   токены разные" || echo "FAIL токены одинаковые"
[ "$U1" != "$U2" ] && echo "OK   userId разные" || echo "FAIL userId одинаковые"

echo
echo "=== 3. register / login / logout ==="
R=$(curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
    -d '{"username":"alice","password":"pass"}')
echo "register: $R"
T3=$(echo "$R" | jq -r .token)

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/api/auth/register \
       -H 'Content-Type: application/json' -d '{"username":"alice","password":"pass"}')
check "повторная регистрация → 400" 400 "$code"

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/api/auth/login \
       -H 'Content-Type: application/json' -d '{"username":"alice","password":"wrong"}')
check "login неверный пароль → 401" 401 "$code"

LOGIN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
        -d '{"username":"alice","password":"pass"}')
T3=$(echo "$LOGIN" | jq -r .token)
[ "$T3" != "null" ] && echo "OK   login вернул токен" || echo "FAIL login"

ME=$(curl -s $BASE/api/auth/me -H "X-Session-Token: $T3")
echo "me: $ME"
[ "$(echo "$ME" | jq -r .username)" = "alice" ] && echo "OK   me = alice" || echo "FAIL me"

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/api/auth/logout -H "X-Session-Token: $T3")
check "logout → 204" 204 "$code"

code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/auth/me -H "X-Session-Token: $T3")
check "me после logout → 401" 401 "$code"

echo
echo "=== 4. User profile ==="
U1BEFORE=$(curl -s $BASE/api/user -H "X-Session-Token: $T1")
U2BEFORE=$(curl -s $BASE/api/user -H "X-Session-Token: $T2")
echo "user1: $U1BEFORE"
echo "user2: $U2BEFORE"

echo
echo "=== 5. Раунды и изоляция ==="
R1=$(curl -s -X POST $BASE/api/round/start -H "X-Session-Token: $T1" \
     -H 'Content-Type: application/json' \
     -d '{"theme":"RED","betAmount":100,"boosterMultiplier":2}')
R2=$(curl -s -X POST $BASE/api/round/start -H "X-Session-Token: $T2" \
     -H 'Content-Type: application/json' \
     -d '{"theme":"GREEN","betAmount":200,"boosterMultiplier":1}')
echo "round1: $R1"
echo "round2: $R2"
RID1=$(echo "$R1" | jq -r .roundId)
RID2=$(echo "$R2" | jq -r .roundId)

code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/round/$RID1/state -H "X-Session-Token: $T2")
check "чужий раунд → 404" 404 "$code"

code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/round/$RID1/state -H "X-Session-Token: $T1")
check "свой раунд → 200" 200 "$code"

echo
echo "=== 6. Краш-окно (главный баг) ==="
echo "Поллим раунд $RID1, ждём CRASHED, потом проверяем что currentMultiplier не растёт..."
prev=""
for i in $(seq 1 60); do
  st=$(curl -s $BASE/api/round/$RID1/state -H "X-Session-Token: $T1")
  status=$(echo "$st" | jq -r .status)
  cur=$(echo "$st" | jq -r .currentMultiplier)
  crash=$(echo "$st" | jq -r .crashMultiplier)
  echo "tick $i status=$status current=$cur crash=$crash"
  if [ "$status" = "CRASHED" ]; then
    sleep 0.5
    st2=$(curl -s $BASE/api/round/$RID1/state -H "X-Session-Token: $T1")
    c2=$(echo "$st2" | jq -r .currentMultiplier)
    cr=$(echo "$st2" | jq -r .crashMultiplier)
    if [ "$c2" = "$cr" ]; then
      echo "OK   после краха current == crash ($c2 == $cr)"
    else
      echo "FAIL после краха current=$c2, crash=$cr — баг окна"
    fi
    break
  fi
  sleep 0.3
done

echo
echo "=== 7. Cashout ==="
R3=$(curl -s -X POST $BASE/api/round/start -H "X-Session-Token: $T1" \
     -H 'Content-Type: application/json' \
     -d '{"theme":"RED","betAmount":1000,"boosterMultiplier":1}')
RID3=$(echo "$R3" | jq -r .roundId)
sleep 1
CO=$(curl -s -X POST $BASE/api/round/$RID3/cashout -H "X-Session-Token: $T1")
echo "cashout: $CO"
status=$(echo "$CO" | jq -r .status)
[ "$status" = "CASHED_OUT" ] && echo "OK   cashout" || echo "FAIL cashout status=$status"

U1AFTER=$(curl -s $BASE/api/user -H "X-Session-Token: $T1")
echo "user1 after: $U1AFTER"

echo
echo "=== 8. История ==="
H1=$(curl -s "$BASE/api/history" -H "X-Session-Token: $T1")
H2=$(curl -s "$BASE/api/history" -H "X-Session-Token: $T2")
echo "history T1 count = $(echo "$H1" | jq 'length')"
echo "history T2 count = $(echo "$H2" | jq 'length')"
echo "history T1 (first 2): $(echo "$H1" | jq '.[:2]')"

H1LIM=$(curl -s "$BASE/api/history?limit=1" -H "X-Session-Token: $T1")
[ "$(echo "$H1LIM" | jq 'length')" = "1" ] && echo "OK   limit=1" || echo "FAIL limit"

echo
echo "=== ИТОГО: PASS=$PASS FAIL=$FAIL ==="
echo
echo "Нажми Enter чтобы закрыть..."
read