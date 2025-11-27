import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import TestApp from "./TestApp";

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement,
);

// Use TestApp if ?test=true is in URL, otherwise use regular App
const isTestMode = window.location.search.includes("test=true");
const AppComponent = isTestMode ? TestApp : App;

root.render(
	<React.StrictMode>
		<AppComponent />
	</React.StrictMode>,
);
