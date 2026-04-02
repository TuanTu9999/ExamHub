import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsAPI, submissionsAPI, getErrorMessage } from '../api/index.js';

export default function ExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examsAPI.get(id)
      .then(res => {
        setExam(res.data.exam);
        setQuestions(res.data.questions);
        setTimeLeft(res.data.exam.duration_min * 60);
      })
      .catch(err => {
        alert(getErrorMessage(err));
        navigate('/dashboard');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (qIndex, value) => {
    setAnswers(prev => ({ ...prev, [qIndex]: value }));
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      const userAnswer = answers[idx];
      if (!userAnswer) return;
      if (q.qtype === 'single') {
        if (Number(userAnswer) === q.correct) correct++;
      }
    });
    return { correct, total: questions.length, score: (correct / questions.length) * 10 };
  };

  const handleSubmit = async (auto = false) => {
    if (submitting) return;
    if (!auto && !confirm('Bạn có chắc muốn nộp bài?')) return;
    
    setSubmitting(true);
    const { correct, total, score } = calculateScore();
    const timeSpent = exam.duration_min * 60 - timeLeft;
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    
    try {
      await submissionsAPI.submit({
        exam_id: exam.id,
        exam_name: exam.name,
        subject: exam.subject || 'general',
        score: score.toFixed(1),
        correct_count: correct,
        total_questions: total,
        time_taken: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        answers_json: answers,
        is_trial: false
      });
      navigate(`/result/${exam.id}`, { state: { score, correct, total, examName: exam.name } });
    } catch (err) {
      alert('Lỗi khi nộp bài: ' + getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Đang tải bài thi...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h2>{exam?.name}</h2>
      <div style={{ marginBottom: 20, padding: 10, background: '#f0f0f0', borderRadius: 5 }}>
        Thời gian còn lại: <strong style={{ fontSize: 24, color: timeLeft < 60 ? 'red' : 'green' }}>{formatTime(timeLeft)}</strong>
      </div>
      {questions.map((q, idx) => (
        <div key={idx} style={{ marginBottom: 30, padding: 15, border: '1px solid #ddd', borderRadius: 8 }}>
          <p><strong>Câu {idx + 1}:</strong> {q.text_md}</p>
          {q.opts_json?.map((opt, optIdx) => (
            <label key={optIdx} style={{ display: 'block', margin: 10, cursor: 'pointer' }}>
              <input
                type="radio"
                name={`q${idx}`}
                value={optIdx}
                checked={answers[idx] == optIdx}
                onChange={(e) => handleAnswer(idx, e.target.value)}
              /> {opt}
            </label>
          ))}
        </div>
      ))}
      <button 
        onClick={() => handleSubmit(false)} 
        disabled={submitting}
        style={{
          padding: '10px 20px',
          background: '#4f8ef7',
          color: 'white',
          border: 'none',
          borderRadius: 5,
          cursor: 'pointer',
          fontSize: 16
        }}
      >
        {submitting ? 'Đang nộp...' : 'Nộp bài'}
      </button>
    </div>
  );
}
