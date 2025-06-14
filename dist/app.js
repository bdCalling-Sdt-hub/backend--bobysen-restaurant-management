"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const globalErrorhandler_1 = __importDefault(require("./app/middleware/globalErrorhandler"));
const notfound_1 = __importDefault(require("./app/middleware/notfound"));
const routes_1 = __importDefault(require("./app/routes"));
const app = (0, express_1.default)();
app.use(express_1.default.static("public"));
app.use(body_parser_1.default.urlencoded({ extended: true }));
//parsers
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: [
        "https://mybookatable.mu",
        "https://bookatable.mu",
        "https://socket.bookatable.mu",
        "http://localhost:5173",
        "http://localhost:3000",
        "https://reservation.bookatable.mu",
    ], // Allow all originss
    // credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
}));
// application routes
app.use("/api/v1", routes_1.default);
app.get("/", (req, res) => {
    res.send("server is running");
});
app.use(globalErrorhandler_1.default);
//Not Found
app.use(notfound_1.default);
exports.default = app;
