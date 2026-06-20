import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3'; // Opcional: só se quiser salvar os dados além de mandar pro Whats
import 'dotenv/config';

const app = express();
app.use(cors()); 
app.use(express.json());

// 💡 ISSO É O MAIS IMPORTANTE: Serve os arquivos HTML, CSS e JS da pasta public
app.use(express.static('public'));

// Rota de verificação simples
app.get('/status', (req, res) => {
  res.json({ status: 'BarberBot backend online' });
});

// --- CONFIGURAÇÃO OPCIONAL DO BANCO DE DADOS ---
// Se você não quiser mais usar o SQLite e focar 100% no WhatsApp, pode deletar este bloco do banco.
const db = new sqlite3.Database('./agenda_barbearia.db', (err) => {
  if (err) console.error('Erro ao abrir o SQLite:', err.message);
  else console.log('Conectado ao banco de dados SQLite com sucesso.');
});

db.run(`CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT NOT NULL,
    servico TEXT NOT NULL,
    profissional TEXT,
    horario TEXT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Rota opcional caso o seu app.js queira salvar no banco antes de abrir o WhatsApp
app.post('/api/agendar', (req, res) => {
  const { nome, servico, profissional, horario } = req.body;

  db.run(
    `INSERT INTO agendamentos (cliente, servico, profissional, horario) VALUES (?, ?, ?, ?)`,
    [nome, servico, profissional, horario],
    function (err) {
      if (err) {
        console.error('Erro no SQLite:', err.message);
        return res.status(500).json({ erro: 'Erro ao salvar no banco.' });
      }
      res.json({ sucesso: true, id: this.lastID });
    }
  );
});
// ------------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor da Barber Connect rodando na porta ${PORT}`)
);
