import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Corrigido para o nome de exportação correto do pacote clássico
import 'dotenv/config';

const app = express();
app.use(cors()); // Em produção, pode-se restringir com { origin: 'https://seusite.vercel.app' }
app.use(express.json());
app.use(express.static('public'));

// Rota de verificação simples (útil para checar se o Render acordou o serviço)
app.get('/', (req, res) => {
  res.json({ status: 'BarberBot backend online' });
});

// 1. Inicializar o Banco de Dados SQLite local
const db = new sqlite3.Database('./agenda_barbearia.db', (err) => {
  if (err) console.error('Erro ao abrir o SQLite:', err.message);
  else console.log('Conectado ao banco de dados SQLite com sucesso.');
});

// Criar tabela de agendamentos se não existir
db.run(`CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT NOT NULL,
    servico TEXT NOT NULL,
    data TEXT NOT NULL,
    hora TEXT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// 2. Configurar o SDK do Gemini (Instanciação clássica correta)
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `
Você é o BarberBot, o assistente inteligente oficial da barbearia Barber Connect em Teresina-PI.
Seu objetivo é ajudar os clientes com dúvidas e realizar AGENDAMENTOS de forma simpática.

Preços e Serviços Oficiais:
- Corte Clássico: R$ 45,00 (40 minutos)
- Barba Completa: R$ 35,00 (30 minutos)
- Combo Premium (corte + barba + sobrancelha + lavagem): R$ 90,00 (90 minutos)
- Hidratação Capilar: R$ 55,00 (45 minutos)
- Luzes & Coloração: R$ 120,00 (120 minutos)
- Sobrancelha Design: R$ 20,00 (15 minutos)

Equipe: Marcos Oliveira (fundador, Master Barber, 12 anos), Rafael Santos (Barber Sênior, especialista em fade, 8 anos), Diego Costa (Colorista & Designer), Bruno Mendes (Barber & Esteticista).

Endereço: Av. Frei Serafim, 2352 – Centro, Teresina – PI, CEP 64001-020
Horário: Segunda a sexta das 9h às 20h, sábado das 8h às 18h, domingo fechado.
Telefone/WhatsApp: (86) 9 9999-0001

Se o cliente quiser realizar um agendamento, você deve usar a ferramenta 'salvarNoBanco'.
Atenção: Só chame a função 'salvarNoBanco' DEPOIS que tiver coletado os 4 dados obrigatórios do cliente: Nome, Serviço, Data e Horário.
`;

// Definição da ferramenta (Function Calling)
const barberTools = [
  {
    functionDeclarations: [
      {
        name: 'salvarNoBanco',
        description:
          'Grava o agendamento de um serviço diretamente no banco de dados SQLite.',
        parameters: {
          type: 'OBJECT',
          properties: {
            nomeCliente: { type: 'STRING', description: 'Nome do cliente' },
            servico: { type: 'STRING', description: 'O serviço escolhido' },
            data: {
              type: 'STRING',
              description: 'Data do agendamento (ex: 20/06/2026)',
            },
            hora: {
              type: 'STRING',
              description: 'Horário escolhido (ex: 15:00)',
            },
          },
          required: ['nomeCliente', 'servico', 'data', 'hora'],
        },
      },
    ],
  },
];

// Rota para processar o chat
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;

  try {
    // Configuração do modelo no padrão clássico
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: barberTools,
    });

    // Inicia o chat com o histórico estruturado
    const chat = model.startChat({
      history: history || [],
      generationConfig: {
        temperature: 0.4,
      },
    });

    let result = await chat.sendMessage(message);
    let response = result.response;

    // Verificar se o Gemini decidiu invocar a Tool (Function Calling)
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];

      if (call.name === 'salvarNoBanco') {
        const { nomeCliente, servico, data, hora } = call.args;

        // Inserção real dos dados no SQLite
        db.run(
          `INSERT INTO agendamentos (cliente, servico, data, hora) VALUES (?, ?, ?, ?)`,
          [nomeCliente, servico, data, hora],
          async function (err) {
            if (err) {
              console.error('Erro no SQLite:', err.message);
              res.json({
                text: 'Houve um erro ao acessar o banco de dados. Por favor, tente novamente.',
              });
              return;
            }

            console.log(
              `💾 Agendamento inserido com sucesso! ID: ${this.lastID}`
            );

            // Envia o resultado do banco de dados de volta para a IA finalizar a resposta
            try {
              const finalResult = await chat.sendMessage([
                {
                  functionResponse: {
                    name: 'salvarNoBanco',
                    response: {
                      result: `Sucesso! Agendamento número ${this.lastID} foi gravado para o cliente ${nomeCliente}.`,
                    },
                  },
                },
              ]);
              res.json({ text: finalResult.response.text });
            } catch (apiErr) {
              res.json({
                text: `Perfeito! O seu agendamento para o serviço "${servico}" no dia ${data} às ${hora} foi guardado com sucesso!`,
              });
            }
          }
        );
        return;
      }
    }

    res.json({ text: response.text });
  } catch (error) {
    console.error('Erro no fluxo do chat:', error);
    res
      .status(500)
      .json({ text: 'Erro ao comunicar com a inteligência artificial.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor da Barber Connect a rodar na porta ${PORT}`)
);
