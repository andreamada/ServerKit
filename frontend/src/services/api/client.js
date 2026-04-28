// Base HTTP client — constructor, token management, core request methods
const API_BASE_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? '/api/v1' : 'http://127.0.0.1:5001/api/v1');

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    getToken() {
        return localStorage.getItem('access_token');
    }

    setTokens(accessToken, refreshToken) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
    }

    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const token = this.getToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
            ...options,
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);

            if (response.status === 401) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    config.headers.Authorization = `Bearer ${this.getToken()}`;
                    const retryResponse = await fetch(url, config);
                    return this.handleResponse(retryResponse);
                }
                this.clearTokens();
                window.location.href = '/login';
                throw new Error('Session expired');
            }

            return this.handleResponse(response);
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async handleResponse(response) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }
        return data;
    }

    async refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${refreshToken}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access_token);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }
}

export default ApiClient;
