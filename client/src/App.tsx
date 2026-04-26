/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Crown } from 'lucide-react';
import confetti from 'canvas-confetti';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { motion, AnimatePresence } from 'motion/react';

let socket: Socket;

// === TYPES ===
interface Player {
  id: string;
  name: string;
  imageUrl: string;
  isCreator: boolean;
  tags: string[];
  totalPoints: number;
  verified: boolean;
  playerResult: {
    mode: 'Personagem' | 'Evento' | 'KDA';
    points: number;
    details: any;
  } | null;
}
type RoomStatus = 
  | 'waiting' 
  | 'spinning_president' 
  | 'event_dobra_arrega' 
  | 'spinning_mod_step' 
  | 'spinning_mod' 
  | 'players_round'
  | 'playing'
  | 'verifying';

interface RoomState {
  roomId: string;
  players: Player[];
  status: RoomStatus;
  presidentId: string | null;
  currentMods: { name: string; description: string; imageUrl?: string }[];
  isDoubleRound: boolean;
  nextRoundDouble: boolean;
  eventTriggered: boolean;
  creatorId: string;
}

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerImage, setPlayerImage] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [winnerMods, setWinnerMods] = useState<any[] | null>(null);
  const [playerConfig, setPlayerConfig] = useState<{ mode: string, useBuild: boolean, useLane: boolean, qty: number }>({
    mode: '',
    useBuild: false,
    useLane: false,
    qty: 1
  });

  const roomRef = useRef<RoomState | null>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const submitChoice = () => {
    socket.emit('submit_player_choice', { 
      roomId, 
      mode: playerConfig.mode, 
      config: { useBuild: playerConfig.useBuild, useLane: playerConfig.useLane, qty: playerConfig.qty } 
    });
  };

  useEffect(() => {
    // Conectar ao backend (Render em prod, localhost em dev)
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    socket = io(backendUrl);

    socket.on('room_created', (id) => {
      setRoomId(id);
    });

    socket.on('room_update', (newRoomState: RoomState) => {
      setRoom(newRoomState);
      setRoomId(newRoomState.roomId);
      
      const newStatus = newRoomState.status;
      if (newStatus === 'playing' || newStatus === 'event_dobra_arrega') {
         confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    });

    socket.on('president_spin_start', ({ winnerId }) => {
      setIsSpinning(true);
      setWinnerName(null);
      
      // Simular roleta por 5 segundos
      setTimeout(() => {
        setIsSpinning(false);
        const currentRoom = roomRef.current;
        const winner = currentRoom?.players.find(p => p.id === winnerId);
        if (winner) setWinnerName(winner.name);
        
        // Mostrar o vencedor por 3 segundos antes de avisar o server
        setTimeout(() => {
          setWinnerName(null);
          // Pequeno delay para garantir que o estado local limpou antes da resposta do server chegar
          setTimeout(() => {
            socket.emit('president_spin_end', { roomId: currentRoom?.roomId, winnerId });
          }, 50);
        }, 3000);
      }, 5000);
    });

    socket.on('mod_spin_start', ({ selectedMods }) => {
      setIsSpinning(true);
      setWinnerMods(null);
      
      // Simular roleta por 4 segundos
      setTimeout(() => {
        setIsSpinning(false);
        setWinnerMods(selectedMods);
        
        // Exibir os Modificadores sorteados por 7 segundos se for duplo, 5 se for único
        const displayTime = selectedMods.length > 1 ? 7000 : 5000;
        setTimeout(() => {
          setWinnerMods(null);
          socket.emit('mod_spin_end', { roomId: roomRef.current?.roomId, selectedMods });
        }, displayTime);
      }, 4000);
    });

    socket.on('error_msg', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = () => {
    if (!playerName.trim()) return setError('Digite seu nome');
    socket.emit('create_room', { playerName, playerImage });
  };

  const joinRoom = () => {
    if (!playerName.trim() || !joinRoomId.trim()) return setError('Preencha os campos');
    socket.emit('join_room', { roomId: joinRoomId.toUpperCase(), playerName, playerImage });
  };

  if (!roomId || !room) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans border-8 border-slate-900">
        <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 p-8 shadow-[0_0_50px_rgba(34,211,238,0.05)] space-y-6 rounded-none">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-100">Roleta Presidente</h1>
            <p className="text-slate-500 text-xs tracking-widest uppercase">Crie ou entre em uma sala</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Seu Nickname</label>
              <input 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="EX: PRESIDENTE_BOLADAO"
                className="bg-slate-900/20 border-slate-800 text-slate-100 h-12 rounded-none uppercase tracking-wider text-sm focus-visible:ring-cyan-500 focus-visible:border-cyan-500 w-full px-3 py-2 border outline-none"
                maxLength={20}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">URL da Imagem (Opcional)</label>
              <input 
                value={playerImage}
                onChange={(e) => setPlayerImage(e.target.value)}
                placeholder="HTTPS://..."
                className="bg-slate-900/20 border-slate-800 text-slate-100 h-10 rounded-none tracking-wider text-xs focus-visible:ring-cyan-500 focus-visible:border-cyan-500 w-full px-3 py-2 border outline-none"
              />
            </div>

            {error && <p className="text-red-500 text-xs font-bold tracking-widest text-center uppercase">{error}</p>}
          </div>

          <div className="space-y-4 pt-4">
            <button onClick={createRoom} className="w-full h-12 bg-cyan-500 text-slate-950 hover:bg-cyan-400 rounded-none font-black text-sm uppercase tracking-widest transition-colors flex items-center justify-center cursor-pointer">
              <PlusIcon className="w-5 h-5 mr-2" /> Criar Nova Sala
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-slate-950 px-2 text-slate-500">ou</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <input 
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="CÓDIGO (5)"
                className="bg-slate-900/20 border-slate-800 text-cyan-400 h-12 rounded-none uppercase text-center focus-visible:ring-cyan-500 focus-visible:border-cyan-500 font-bold tracking-widest w-full border outline-none min-w-0"
                maxLength={5}
              />
              <button onClick={joinRoom} className="h-12 px-6 rounded-none border-2 border-slate-700 text-slate-300 hover:bg-slate-800 font-black text-sm uppercase tracking-widest transition-colors mb-0 bg-transparent flex justify-center items-center shrink-0 cursor-pointer">
                Entrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === ROOM ACTIONS ===
  const amICreator = room.creatorId === socket.id;
  const amIPresident = room.presidentId === socket.id;
  const presidentPlayer = room.players.find(p => p.id === room.presidentId);
  const myPlayer = room.players.find(p => p.id === socket.id);

  const renderContent = () => {
    if (isSpinning) {
      const isDrawingPresident = room.status === 'spinning_president';
      return (
        <div className="relative w-72 h-72 sm:w-96 sm:h-96 border-[16px] border-slate-900 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(34,211,238,0.05)] mx-auto">
          <div className="absolute inset-0 border border-slate-800/50 rounded-full"></div>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }} className="absolute inset-0">
             <div className="absolute w-full h-[1px] bg-slate-800/50 rotate-45 top-1/2"></div>
             <div className="absolute w-full h-[1px] bg-slate-800/50 -rotate-45 top-1/2"></div>
             <div className="absolute w-full h-[1px] bg-slate-800/50 rotate-90 top-1/2"></div>
             <div className="absolute w-full h-[1px] bg-slate-800/50 top-1/2"></div>
          </motion.div>
          
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-900 border-4 border-cyan-500 rounded-full z-10 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(34,211,238,0.2)]">
             <span className="text-[8px] sm:text-[10px] uppercase font-bold text-cyan-400 tracking-widest animate-pulse">Sorteando</span>
             <span className="text-lg sm:text-xl font-black text-white leading-none tracking-tighter uppercase mt-1 text-center px-2">
               {isDrawingPresident ? 'Pres.' : 'Mod'}
             </span>
          </div>

          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-cyan-500 z-20"></div>
        </div>
      );
    }

    if (winnerName) {
      return (
        <div className="flex flex-col items-center text-center space-y-4">
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest">O Presidente É</span>
          <h2 className="text-5xl sm:text-7xl font-black text-slate-100 uppercase tracking-tighter shadow-sm mb-4">
            {winnerName}
          </h2>
        </div>
      );
    }

    if (winnerMods) {
      return (
        <div className={cn("flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in duration-500", winnerMods.length > 1 ? "max-w-4xl" : "max-w-md")}>
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest">
            {winnerMods.length > 1 ? 'Modificadores Sorteados (DOBRA!)' : 'Modificador Sorteado'}
          </span>
          
          <div className={cn("grid gap-8 w-full", winnerMods.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {winnerMods.map((mod, idx) => (
              <div key={idx} className="flex flex-col items-center space-y-4">
                {mod.imageUrl && (
                  <img src={mod.imageUrl} alt={mod.name} className="w-full h-40 object-cover border-4 border-cyan-500 shadow-[0_0_50px_rgba(34,211,238,0.2)] mb-2" />
                )}
                <h2 className="text-2xl sm:text-4xl font-black text-slate-100 uppercase tracking-tighter italic leading-tight">
                  {mod.name}
                </h2>
                <p className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest leading-relaxed">
                  {mod.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    switch (room.status) {
      case 'waiting':
        return (
          <div className="flex flex-col items-center text-center space-y-8 w-full max-w-md mx-auto px-4">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest">Sorteio de Presidente</span>
              <h2 className="text-5xl font-black text-slate-100 uppercase tracking-tighter shadow-sm">
                Sala {room.roomId}
              </h2>
            </div>
            
            <p className="text-slate-400 text-sm mb-4">Aguardando participantes...</p>

            {amICreator ? (
              <button 
                onClick={() => socket.emit('start_president_spin', { roomId })}
                className={cn("w-full h-16 text-lg font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950 uppercase tracking-widest transition-all", room.players.length < 1 ? "opacity-50 cursor-not-allowed" : "cursor-pointer")}
                disabled={room.players.length < 1}
              >
                Sortear Presidente
              </button>
            ) : (
              <div className="p-4 border border-slate-800 bg-slate-900/50 w-full">
                <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Aguardando o criador iniciar o sorteio...</p>
              </div>
            )}
          </div>
        );

      case 'event_dobra_arrega':
        return (
          <div className="flex flex-col items-center text-center space-y-8 px-4 w-full">
            <div className="space-y-2">
              <h2 className="text-5xl sm:text-7xl font-black text-orange-500 animate-pulse uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                DOBRA OU ARREGA?!
              </h2>
              <p className="text-sm text-slate-400 uppercase tracking-widest max-w-md mx-auto">
                <strong className="text-slate-100">{presidentPlayer?.name}</strong>, seu mandato caiu no evento especial de 20%.
              </p>
            </div>

            {amIPresident ? (
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-8">
                <button 
                  onClick={() => socket.emit('choose_dobra_arrega', { roomId, choice: 'dobrar' })}
                  className="flex-1 h-16 text-sm font-black bg-orange-500 text-slate-950 uppercase tracking-widest transition-colors hover:bg-orange-400 cursor-pointer"
                >
                  Dobrar
                </button>
                <button 
                  onClick={() => socket.emit('choose_dobra_arrega', { roomId, choice: 'arregar' })}
                  className="flex-1 h-16 text-sm font-black border-2 border-orange-500 text-orange-500 uppercase tracking-widest transition-colors hover:bg-orange-500/10 cursor-pointer"
                >
                  Arregar
                </button>
              </div>
            ) : (
              <div className="p-4 border border-orange-500/30 bg-orange-500/5 w-full max-w-md mt-6">
                <p className="text-center text-orange-400 animate-pulse text-xs uppercase font-bold tracking-widest">Aguardando decisão do Presidente...</p>
              </div>
            )}
          </div>
        );

      case 'spinning_mod_step':
        return (
          <div className="text-center w-full max-w-md px-4">
            <div className="mb-8">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest">Ação Necessária</span>
              <h2 className="text-4xl font-black uppercase text-slate-100 tracking-tighter mt-1">{presidentPlayer?.name}</h2>
            </div>
            
            {amIPresident ? (
              <div className="space-y-4">
                <button 
                  onClick={() => socket.emit('start_mod_spin', { roomId })}
                  className="w-full h-16 bg-cyan-500 text-slate-950 font-black uppercase tracking-widest text-sm hover:bg-cyan-400 transition-colors cursor-pointer"
                >
                  Sortear Modificador
                </button>
              </div>
            ) : (
              <div className="p-4 border border-slate-800 bg-slate-900/50">
                <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Aguardando ação do Presidente...</p>
              </div>
            )}
          </div>
        );

      case 'players_round':
        return (
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest">Rodada dos Jogadores</span>
              <h2 className="text-3xl font-black uppercase text-white tracking-tighter mt-1">Sua Vez</h2>
            </div>

            {myPlayer?.playerResult ? (
              <div className="p-6 border border-cyan-500/30 bg-cyan-500/5 space-y-4">
                <div className="flex justify-between items-center border-b border-cyan-500/20 pb-2">
                   <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest">Modalidade: {myPlayer.playerResult.mode}</span>
                   <span className="text-lg font-black text-white">{myPlayer.playerResult.points > 0 ? '+' : ''}{myPlayer.playerResult.points} Pts</span>
                </div>
                
                {myPlayer.playerResult.mode === 'Personagem' && (
                  <div className="space-y-4 flex flex-col items-center">
                    <img src={myPlayer.playerResult.details.imageUrl} alt={myPlayer.playerResult.details.char} className="w-48 h-28 object-cover border-2 border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.2)]" />
                    <div className="text-center">
                      <p className="text-2xl font-black uppercase italic">{myPlayer.playerResult.details.char}</p>
                      <div className="flex gap-2 justify-center mt-2">
                         {myPlayer.playerResult.details.build && <span className="text-[10px] bg-slate-800 px-2 py-1 uppercase font-bold border border-slate-700">{myPlayer.playerResult.details.build}</span>}
                         {myPlayer.playerResult.details.lane && <span className="text-[10px] bg-slate-800 px-2 py-1 uppercase font-bold border border-slate-700">{myPlayer.playerResult.details.lane}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {myPlayer.playerResult.mode === 'Evento' && (
                   <ul className="space-y-1">
                      {myPlayer.playerResult.details.events.map((e: string) => (
                        <li key={e} className="text-sm font-bold uppercase text-slate-300 flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-cyan-500"></div> {e}
                        </li>
                      ))}
                   </ul>
                )}

                {myPlayer.playerResult.mode === 'KDA' && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-8 justify-center py-2">
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-500">Alvo Kills</p>
                        <p className="text-4xl font-black">+{myPlayer.playerResult.details.k}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-500">Alvo Mortes</p>
                        <p className="text-4xl font-black">-{myPlayer.playerResult.details.d}</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-3 py-1 border border-cyan-500/20">
                      KDA Sugerido: {myPlayer.playerResult.details.kda}
                    </div>
                  </div>
                )}

                {amICreator && (
                   <button 
                    onClick={() => socket.emit('finish_players_round', { roomId })}
                    className="w-full h-12 bg-cyan-500 text-slate-950 font-black uppercase tracking-widest text-xs hover:bg-cyan-400 mt-4 cursor-pointer"
                  >
                    Iniciar Partida
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {['Personagem', 'Evento', 'KDA'].map(m => (
                    <button 
                      key={m}
                      onClick={() => setPlayerConfig(prev => ({ ...prev, mode: m as any }))}
                      className={cn("h-12 text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer", playerConfig.mode === m ? "bg-cyan-500 text-slate-950 border-cyan-500" : "bg-transparent text-slate-400 border-slate-800 hover:border-slate-600")}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {playerConfig.mode === 'Personagem' && (
                  <div className="p-4 bg-slate-900/50 border border-slate-800 space-y-3">
                     <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Modificadores Bônus</p>
                     <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-300 cursor-pointer">
                          <input type="checkbox" checked={playerConfig.useBuild} onChange={e => setPlayerConfig(p => ({ ...p, useBuild: e.target.checked }))} className="w-4 h-4" /> Build (+2)
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-300 cursor-pointer">
                          <input type="checkbox" checked={playerConfig.useLane} onChange={e => setPlayerConfig(p => ({ ...p, useLane: e.target.checked }))} className="w-4 h-4" /> Lane (+2)
                        </label>
                     </div>
                  </div>
                )}

                {playerConfig.mode === 'Evento' && (
                   <div className="p-4 bg-slate-900/50 border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Quantidade de Eventos (1-5)</p>
                      <input 
                        type="range" min="1" max="5" value={playerConfig.qty} 
                        onChange={e => setPlayerConfig(p => ({ ...p, qty: parseInt(e.target.value) }))}
                        className="w-full accent-cyan-500"
                      />
                      <div className="flex justify-between text-xs font-black text-cyan-400 mt-1">
                        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                      </div>
                   </div>
                )}

                {playerConfig.mode === 'KDA' && (
                  <div className="p-4 bg-slate-900/50 border border-slate-800 text-center">
                    <p className="text-xs font-bold text-slate-300 uppercase leading-relaxed italic">
                      "Sorteie seus alvos. Regra: Kills não podem exceder mortes."
                    </p>
                  </div>
                )}

                {playerConfig.mode && (
                  <button 
                    onClick={submitChoice}
                    className="w-full h-16 bg-white text-slate-950 font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Girar Roleta Individual
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 'playing': {
        return (
          <div className="flex flex-col items-center text-center space-y-8 px-4 w-full">
            <div className="w-full">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest block mb-6">Modificadores Ativos</span>
              <div className={cn("grid gap-8", room.currentMods.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                {room.currentMods.map((mod, idx) => (
                  <div key={idx} className="space-y-4">
                    {mod.imageUrl && (
                       <img src={mod.imageUrl} alt={mod.name} className="w-full h-36 object-cover mx-auto border-2 border-cyan-500 mb-2" />
                    )}
                    <h3 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase text-slate-100 leading-tight">{mod.name}</h3>
                    <p className="text-slate-400 max-w-xs mx-auto text-[10px] uppercase tracking-wide leading-relaxed">
                      {mod.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="w-full max-w-md p-4 bg-slate-900/50 border border-slate-800">
               <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Resumo dos Jogadores</h4>
               <div className="space-y-2">
                  {room.players.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-xs border-b border-slate-800/50 pb-2">
                      <div className="flex items-center gap-2">
                        <img src={p.imageUrl} alt={p.name} className="w-5 h-5 rounded-full object-cover" />
                        <span className="text-slate-300">{p.name}</span>
                      </div>
                      <span className="font-bold text-cyan-400">
                        {p.playerResult ? `${p.playerResult.mode} (${p.playerResult.points > 0 ? '+' : ''}${p.playerResult.points})` : '-'}
                      </span>
                    </div>
                  ))}
               </div>
            </div>

            {amICreator ? (
              <button 
                onClick={() => socket.emit('reset_match', { roomId })}
                className="w-full max-w-md h-16 bg-cyan-500 text-slate-950 font-black uppercase tracking-widest text-sm hover:bg-cyan-400 transition-colors mt-8 cursor-pointer"
              >
                Finalizar e Avaliar
              </button>
            ) : (
               <div className="p-4 border border-slate-800 bg-slate-900/50 w-full max-w-md mt-8">
                 <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Aguardando criador finalizar partida...</p>
               </div>
            )}
          </div>
        );
      }
      
      case 'verifying':
        return (
          <div className="flex flex-col items-center text-center space-y-8 px-4 w-full">
            <h2 className="text-4xl sm:text-7xl font-black text-cyan-400 uppercase tracking-tighter animate-pulse drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              E AÍ, CUMPRIU A PARADA?
            </h2>
            
            {myPlayer?.verified ? (
              <div className="p-6 border border-cyan-500/30 bg-cyan-500/5 w-full max-w-md space-y-4">
                <p className="text-center text-cyan-400 text-sm font-bold uppercase tracking-widest">Resposta enviada! Aguardando o encerramento...</p>
                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                  Sincronizando placar...
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 w-full max-w-md">
                <div className="bg-slate-900/50 border border-slate-800 p-4">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-2">Seu Objetivo era:</span>
                  <p className="text-lg font-bold text-slate-100 italic uppercase">
                    {myPlayer?.playerResult?.mode === 'Personagem' ? 
                      `Jogar de ${myPlayer.playerResult.details.char}${myPlayer.playerResult.details.build ? ` ${myPlayer.playerResult.details.build}` : ''}${myPlayer.playerResult.details.lane ? ` ${myPlayer.playerResult.details.lane}` : ''}` : 
                     myPlayer?.playerResult?.mode === 'Evento' ? `Cumprir ${myPlayer.playerResult.details.events.length} eventos` : 
                     `Bater o KDA de ${myPlayer?.playerResult?.details.k}/${myPlayer?.playerResult?.details.d}`}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => socket.emit('verify_result', { roomId, success: true })}
                    className="h-20 bg-green-500 text-slate-950 font-black uppercase tracking-widest text-lg hover:bg-green-400 transition-colors cursor-pointer shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                  >
                    SIM!
                  </button>
                  <button 
                    onClick={() => socket.emit('verify_result', { roomId, success: false })}
                    className="h-20 bg-red-500 text-slate-950 font-black uppercase tracking-widest text-lg hover:bg-red-400 transition-colors cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                  >
                    NÃO...
                  </button>
                </div>
              </div>
            )}

            {amICreator && (
              <button 
                onClick={() => socket.emit('finish_verification', { roomId })}
                className="mt-8 px-6 py-2 border-2 border-slate-700 text-slate-500 hover:text-slate-100 hover:border-slate-500 transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer"
              >
                Encerrar Rodada e Voltar ao Lobby
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100 font-sans border-8 border-slate-900 flex flex-col overflow-x-hidden relative">
      {room.status === 'event_dobra_arrega' && (
         <div className="absolute inset-0 pointer-events-none z-50 border-[16px] border-orange-500/50 animate-pulse"></div>
      )}
      {/* Header */}
      <header className="h-16 shrink-0 border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse hidden sm:block"></div>
          <h1 className="text-xl font-black tracking-tighter uppercase">Roleta Presidente <span className="text-slate-500 font-normal ml-2 hidden sm:inline">// Sala #{room.roomId}</span></h1>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Status</span>
            <span className={cn("text-sm font-bold uppercase", room.status === 'waiting' ? 'text-green-400' : 'text-cyan-400')}>{room.status === 'waiting' ? 'AGUARDANDO' : 'BLOQUEADA'}</span>
          </div>
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Player</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                {playerName}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-0 overflow-y-auto">
        {/* Mobile View Player summary */}
        <section className="lg:hidden border-b border-slate-800 bg-slate-900/20 p-4 shrink-0">
           <div className="flex flex-col gap-2">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Participantes ({room.players.length}/10)</h2>
              <div className="flex flex-wrap gap-2">
                {room.players.map((p) => (
                  <div key={p.id} className={cn("text-[10px] px-2 py-1 flex items-center gap-1 border", p.id === socket.id ? "bg-cyan-500/20 border-cyan-500/40 text-slate-100" : "border-slate-800 bg-slate-800/30 text-slate-300", room.presidentId === p.id && "ring-1 ring-cyan-500")}>
                    <img src={p.imageUrl} className="w-3 h-3 rounded-full object-cover mr-1" alt="" />
                    {p.name} ({p.totalPoints || 0})
                    {p.id === room.creatorId && <Crown className="w-3 h-3 ml-1 text-yellow-500" />}
                    {p.tags.includes('arregão') && <span className="text-[8px] bg-red-500/20 text-red-400 px-1 ml-1 border border-red-500/40">ARREGÃO</span>}
                    {p.tags.includes('Aí tem coragem') && <span className="text-[8px] text-cyan-400 italic font-bold tracking-tight uppercase ml-1">Coragem</span>}
                  </div>
                ))}
              </div>
           </div>
        </section>

        {/* Sidebar: Players (Desktop) */}
        <section className="hidden lg:block lg:col-span-3 border-r border-slate-800 bg-slate-900/20 overflow-y-auto min-h-0">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">Participantes ({room.players.length}/10)</h2>
            <ul className="space-y-3">
              {room.players.map((p) => (
                <li key={p.id} className={cn("flex items-center justify-between p-2", p.id === socket.id ? "border border-cyan-500/30 bg-cyan-500/5" : "border border-slate-800 bg-slate-800/30", room.presidentId === p.id && "ring-1 ring-cyan-500")}>
                  <div className="flex items-center gap-3">
                    <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded-full border border-slate-700 object-cover" />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{p.name}</span>
                        {p.id === room.creatorId && <Crown className="w-3 h-3 text-slate-500" />}
                      </div>
                      <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest">{p.totalPoints || 0} PTS</span>
                    </div>
                  </div>
                  {p.id === room.presidentId ? (
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 border border-cyan-500/40 uppercase font-black">PRESIDENTE</span>
                  ) : p.tags.length > 0 ? (
                    <div className="flex gap-1">
                      {p.tags.map(tag => (
                        <span key={tag} className={cn("text-[10px] px-2 py-0.5 border uppercase font-black", tag === 'arregão' ? "bg-red-500/20 text-red-500 border-red-500/40" : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40")}>
                          {tag === 'arregão' ? 'ARREGÃO' : 'CORAGEM'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">PLAYER</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-6">
            <div className="border-l-2 border-slate-700 pl-4 py-2">
              <p className="text-xs text-slate-500 leading-relaxed italic">
                {room.status === 'waiting' ? "A sala está aberta para novos jogadores. Aguardando o sorteio..." : "\"A entrada de novos jogadores foi suspensa para garantir a integridade da partida.\""}
              </p>
            </div>
          </div>
        </section>

        {/* Center */}
        <section className="lg:col-span-6 bg-slate-950 flex flex-col items-center justify-center relative min-h-[400px] overflow-hidden p-4 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={room.status + (isSpinning ? '-spinning' : '') + (winnerName ? '-winner' : '')}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="w-full flex items-center justify-center flex-1"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Right Side Controls */}
        <section className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/10 shrink-0 flex flex-col justify-end p-6">
             {room.eventTriggered && (
                <div className="p-4 border-2 border-dashed border-orange-500/30 bg-orange-500/5 mb-4 animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <h2 className="text-[10px] uppercase tracking-widest font-black text-orange-500">Evento Especial</h2>
                  </div>
                  <h4 className="text-base font-bold text-orange-400 mb-1 leading-tight">DOBRA OU ARREGA</h4>
                  <p className="text-xs text-slate-400 leading-snug">Probabilidade de ativação: 20%.</p>
                </div>
             )}
             
             {room.isDoubleRound && (
               <div className="p-4 border-2 border-dashed border-cyan-500/30 bg-cyan-500/5 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    <h2 className="text-[10px] uppercase tracking-widest font-black text-cyan-500">Efeito Ativo</h2>
                  </div>
                  <h4 className="text-base font-bold text-cyan-400 mb-1 leading-tight">RODADA EM DOBRO</h4>
                  <p className="text-xs text-slate-400 leading-snug">Dobro de intensidade garantido.</p>
               </div>
             )}

             <div className="mt-auto pt-4">
               <div className="flex items-center gap-2 opacity-50 justify-center lg:justify-start">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Sessão ID:</span>
                  <span className="text-[10px] font-mono text-slate-500">{room.roomId}</span>
                </div>
             </div>
        </section>
      </main>

      {/* Footer Bar */}
      <footer className="h-8 shrink-0 bg-slate-900 border-t border-slate-800 flex items-center px-4 sm:px-8">
        <div className="flex gap-4 sm:gap-8 text-[8px] sm:text-[9px] uppercase tracking-[0.3em] font-bold text-slate-600 truncate w-full flex-wrap">
          <span>Mandato: 1 Presidente/Partida</span>
          <span className="hidden sm:inline">Evento Dobra ou Arrega: 20% de chance</span>
          <span>Mods Ativos: {room.currentMod ? '1' : '0'}</span>
        </div>
      </footer>
    </div>
  );
}


function PlusIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
