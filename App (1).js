import React, { useState } from "react";
import LandingPage from "./Components/LandingPage";
import Descriptionpanel from "./Components/Descriptionpanel";
import SolverPage from "./Components/SolverPage";
import "./App.css";

function App() {
  const [page, setPage] = useState(0);

  return (
    <div className="app-root">
      {page === 0 && <LandingPage onStart={() => setPage(1)} />}
      {page === 1 && (
        <Descriptionpanel
          onNext={() => setPage(2)}
          onBack={() => setPage(0)}
        />
      )}
      {page === 2 && <SolverPage onBack={() => setPage(1)} />}
    </div>
  );
}

export default App;
