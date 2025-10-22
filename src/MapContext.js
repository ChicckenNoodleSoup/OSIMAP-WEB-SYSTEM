import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MapView from "./MapView";
import CurrentRecords from "./CurrentRecords";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/records" element={<CurrentRecords />} />
        <Route path="/map" element={<MapView />} />
      </Routes>
    </Router>
  );
}
