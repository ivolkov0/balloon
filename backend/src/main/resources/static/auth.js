const Auth = (() => {
    const TOKEN_KEY = 'raketka.token';
    const USER_KEY  = 'raketka.user';

    function getToken() { return sessionStorage.getItem(TOKEN_KEY); }
    function setToken(t) { sessionStorage.setItem(TOKEN_KEY, t); }
    function getUser() {
        const s = sessionStorage.getItem(USER_KEY);
        return s ? JSON.parse(s) : null;
    }
    function setUser(u) { sessionStorage.setItem(USER_KEY, JSON.stringify(u)); }
    function clear() {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
    }

    async function ensureGuest() {
        if (getToken()) return;
        const res = await fetch('/api/auth/guest', { method: 'POST' });
        if (!res.ok) throw new Error('guest bootstrap failed');
        const data = await res.json();
        setToken(data.token);
        setUser(data);
    }

    async function apiFetch(path, options = {}) {
        const headers = Object.assign({}, options.headers || {});
        const token = getToken();
        if (token) headers['X-Session-Token'] = token;
        if (options.body && !headers['Content-Type'])
            headers['Content-Type'] = 'application/json';
        let res = await fetch(path, Object.assign({}, options, { headers }));
        if (res.status === 401) {
            clear();
            await ensureGuest();
            headers['X-Session-Token'] = getToken();
            res = await fetch(path, Object.assign({}, options, { headers }));
        }
        return res;
    }

    async function register(username, password) {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error('register failed');
        const data = await res.json();
        setToken(data.token); setUser(data);
        return data;
    }

    async function login(username, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error('login failed');
        const data = await res.json();
        setToken(data.token); setUser(data);
        return data;
    }

    async function logout() {
        const token = getToken();
        if (token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'X-Session-Token': token }
            });
        }
        clear();
        await ensureGuest();
    }

    return { apiFetch, ensureGuest, register, login, logout, getUser, getToken };
})();