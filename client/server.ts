import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

const PORT = 3000;
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

app.use(express.json());

// === GAME STATE ===
interface Player {
  id: string;
  name: string;
  isCreator: boolean;
  tag?: string; // 'arregão' | 'Aí tem coragem'
}

type RoomStatus =
  | 'waiting' // En lobby
  | 'drawing_president' // Rolando a roleta
  | 'president_drawn' // Presidente escolhido, verificando evento (20%)
  | 'dobra_ou_arrega' // Caiu no evento, presidente deve escolher
  | 'drawing_mod' // Sorteando mod
  | 'mod_drawn' // Mod sorteado, rodada em andamento
  | 'playing'; // Jogando sem evento no momento (ou se presidente apenas escolheu dobrar sem evento) -> Wait, logic is: after president drawn, if no event, can select rodada dupla or run mod.

interface RoomState {
  roomId: string;
  players: Player[];
  status: RoomStatus;
  currentPresidentId?: string;
  currentMod?: { name: string; description: string };
  isDoubleRound: boolean;
  nextRoundDouble: boolean;
  eventActivated: boolean; // boolean to show "Dobra ou Arrega!!" screen
}

const rooms = new Map<string, RoomState>();

const MODS = [
  { name: 'Tryhardando', description: 'O jogador só pode jogar com o campeão que mais joga (main), independentemente da posição.' },
  { name: 'Estratégia Coreana', description: 'As posições dos players são invertidas, ninguém joga na posição desejada.' },
  { name: 'Treinando Sério', description: 'O jogador deve escolher apenas personagens com os quais nunca jogou.' },
  { name: 'Vi no Youtube', description: 'Escolha um player, ele escolhe um YouTuber de LoL, e você joga com o campeão do último vídeo na mesma posição.' },
];

io.on('connection', (socket) => {
  socket.on('create_room', (data: { playerName: string }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms.set(roomId, {
      roomId,
      players: [{ id: socket.id, name: data.playerName, isCreator: true }],
      status: 'waiting',
      isDoubleRound: false,
      nextRoundDouble: false,
      eventActivated: false,
    });
    socket.join(roomId);
    socket.emit('room_created', roomId);
    io.to(roomId).emit('room_update', rooms.get(roomId));
  });

  socket.on('join_room', (data: { roomId: string; playerName: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) {
      socket.emit('error', 'Sala não encontrada');
      return;
    }
    if (room.status !== 'waiting') {
      socket.emit('error', 'A sala está em andamento (bloqueada)');
      return;
    }
    room.players.push({ id: socket.id, name: data.playerName, isCreator: false });
    socket.join(data.roomId);
    io.to(data.roomId).emit('room_update', room);
  });

  socket.on('start_president_draw', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    // Pick president
    const president = room.players[Math.floor(Math.random() * room.players.length)];
    room.status = 'drawing_president';
    room.currentPresidentId = president.id;
    io.to(roomId).emit('room_update', room);

    // Simulate roulette delay
    setTimeout(() => {
      // 20% chance of event "Dobra ou Arrega"
      const isEvent = Math.random() < 0.20;
      room.status = 'president_drawn';
      room.eventActivated = isEvent;
      io.to(roomId).emit('room_update', room);

      setTimeout(() => {
        if (isEvent) {
          room.status = 'dobra_ou_arrega';
        } else {
          room.status = 'playing'; // President decides next
        }
        io.to(roomId).emit('room_update', room);
      }, 3000); // give 3s to show president winner

    }, 5000); // 5s wheel 
  });

  socket.on('choose_event', (data: { roomId: string, action: 'dobrar' | 'arregar' }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;
    
    const president = room.players.find(p => p.id === room.currentPresidentId);
    if (!president) return;

    if (data.action === 'dobrar') {
      room.isDoubleRound = true;
      room.nextRoundDouble = true;
      president.tag = 'Aí tem coragem';
      room.status = 'playing';
    } else {
      president.tag = 'arregão';
      room.status = 'playing';
    }
    io.to(data.roomId).emit('room_update', room);
  });

  socket.on('action_double_round', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.currentPresidentId !== socket.id) return;
    // Standard double round request without event
    room.isDoubleRound = true;
    room.nextRoundDouble = true;
    room.status = 'playing';
    io.to(roomId).emit('room_update', room);
  });

  socket.on('start_mod_draw', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.currentPresidentId !== socket.id) return;
    
    room.status = 'drawing_mod';
    room.currentMod = MODS[Math.floor(Math.random() * MODS.length)];
    io.to(roomId).emit('room_update', room);

    setTimeout(() => {
      room.status = 'mod_drawn';
      io.to(roomId).emit('room_update', room);
    }, 4000);
  });

  socket.on('finish_match', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.currentPresidentId !== socket.id) return;

    room.status = 'waiting';
    room.currentPresidentId = undefined;
    room.currentMod = undefined;
    room.eventActivated = false;

    if (room.nextRoundDouble) {
      room.isDoubleRound = true;
      room.nextRoundDouble = false;
    } else {
      room.isDoubleRound = false;
    }
    
    io.to(roomId).emit('room_update', room);
  });

  socket.on('disconnect', () => {
    // Handling disconnects - for simplicity in this prototype, just let them be or remove them if waiting
    rooms.forEach((room, roomId) => {
      if (room.status === 'waiting') {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex > -1) {
          room.players.splice(playerIndex, 1);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            // Re-assign creator if needed
            if (!room.players.some(p => p.isCreator)) {
              room.players[0].isCreator = true;
            }
            io.to(roomId).emit('room_update', room);
          }
        }
      }
      // If playing and they drop, they could stay as ghosts. In a real app we would map by a stable UUID or handle re-connections properly.
    });
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
