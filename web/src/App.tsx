import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import NoteDetail from './pages/NoteDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/note/:noteId" element={<NoteDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
