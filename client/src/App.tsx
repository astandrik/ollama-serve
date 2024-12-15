import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { MetricsPage } from "./pages/MetricsPage";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/metrics" element={<MetricsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
