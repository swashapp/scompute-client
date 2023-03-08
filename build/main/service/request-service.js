"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Request = exports.MESSAGE_TO_SIGN_PREFIX = exports.encodeQueryString = exports.URI = void 0;
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const form_data_1 = __importDefault(require("form-data"));
const jwt = __importStar(require("jsonwebtoken"));
var URI;
(function (URI) {
    URI["USER"] = "user";
    URI["PIPELINE"] = "pipeline";
    URI["EXECUTION"] = "execution";
    URI["SIGNATURE"] = "public/signature";
    URI["CODE_FILE"] = "file/code";
    URI["DATA_FILE"] = "file/data";
})(URI = exports.URI || (exports.URI = {}));
function encodeQueryString(params) {
    return Object.keys(params)
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
        .join('&');
}
exports.encodeQueryString = encodeQueryString;
exports.MESSAGE_TO_SIGN_PREFIX = 'I am signing my one-time nonce';
class Request {
    constructor(session, options) {
        this.getServerApiURL = () => {
            const host = this.options?.host || 'https://scompute-client.swashapp.io';
            const apiVersion = this.options?.apiVersion || 'v1';
            return `${host}/${apiVersion}/`;
        };
        this.getServicesApiURL = () => {
            const host = this.options?.servicesHost || 'https://api.swashapp.io';
            const apiVersion = this.options?.servicesApiVersion || 'v1';
            const apiPrefix = this.options?.servicesApiPrefix || 'scompute';
            return `${host}/${apiPrefix}/${apiVersion}/`;
        };
        this.session = session;
        this.options = options;
    }
    async signWith(signMessage) {
        return await this.call(`${this.getServicesApiURL()}${URI.SIGNATURE}/nonce`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(signMessage);
    }
    async createRequest(method = 'GET') {
        let token = this.session?.token;
        if (!token) {
            const signatureObj = await this.getSignatureObj();
            token = jwt.sign(signatureObj, 'shhhhh');
        }
        return {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${token}`,
            },
        };
    }
    async call(url, req) {
        let message = '';
        try {
            const resp = await (0, cross_fetch_1.default)(url, req);
            const payload = await resp.json();
            if (payload.status === 'success') {
                return payload.data;
            }
            if (payload.status === 'error' || payload.message) {
                message = payload.message;
            }
            if (payload.status === 'expired') {
                if (this.session?.onExpired)
                    this.session.onExpired();
                throw Error(`Session is expired`);
            }
        }
        catch (err) {
            throw Error(`Failed to fetch ${url}`);
        }
        throw Error(message);
    }
    async send(api, method, params) {
        const url = this.getServerApiURL() + api;
        let req = await this.createRequest(method);
        let query = '';
        if (['GET', 'DELETE'].includes(method))
            query = params ? `?${encodeQueryString(params)}` : '';
        else
            req = params ? { ...req, body: JSON.stringify(params) } : req;
        return this.call(url + query, req);
    }
    async GET(api, params) {
        return this.send(api, 'GET', params);
    }
    async DELETE(api, params) {
        return this.send(api, 'DELETE', params);
    }
    async POST(api, body) {
        return this.send(api, 'POST', body);
    }
    async PUT(api, body) {
        return this.send(api, 'PUT', body);
    }
    async DOWNLOAD(api, params) {
        const req = await this.createRequest('GET');
        const query = params ? `?${encodeQueryString(params)}` : '';
        const url = this.getServerApiURL() + api + query;
        return await (0, cross_fetch_1.default)(url, req);
    }
    async POSTFile(api, file, fileName) {
        let req = await this.createRequest('POST');
        delete req.headers['Content-Type'];
        const url = this.getServerApiURL() + api;
        const form = new form_data_1.default();
        form.append('file', file, fileName);
        req = { ...req, body: form };
        return this.call(url, req);
    }
}
exports.Request = Request;
//# sourceMappingURL=request-service.js.map