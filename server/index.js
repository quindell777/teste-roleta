import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const ROOMS_FILE = path.join(process.cwd(), 'rooms.json');

function loadRooms() {
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const data = fs.readFileSync(ROOMS_FILE, 'utf8');
      return new Map(Object.entries(JSON.parse(data)));
    }
  } catch (err) {
    console.error('Error loading rooms:', err);
  }
  return new Map();
}

function saveRooms() {
  try {
    const data = JSON.stringify(Object.fromEntries(rooms));
    fs.writeFileSync(ROOMS_FILE, data, 'utf8');
  } catch (err) {
    console.error('Error saving rooms:', err);
  }
}

const rooms = loadRooms();
const playerSockets = new Map(); // playerId -> socket.id
const socketPlayers = new Map(); // socket.id -> playerId

const MODS = [
  { 
    name: 'Tryhardando', 
    description: 'O jogador só pode jogar com o campeão (boneco) que mais joga (main), independentemente da posição em que cair.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/LeeSin_0.jpg'
  },
  { 
    name: 'Estratégia Coreana', 
    description: 'As posições dos players são invertidas, de modo que nenhum player jogue na sua posição desejada.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yasuo_0.jpg'
  },
  { 
    name: 'Treinando Sério', 
    description: 'O jogador deve escolher apenas personagens com os quais nunca jogou anteriormente.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aphelios_0.jpg'
  },
  { 
    name: 'Vi no Youtube', 
    description: 'O Presidente escolhe um player. O player escolhido escolhe um YouTuber de LoL, e o Presidente deve jogar com o campeão do último vídeo postado por esse YouTuber, na mesma posição que ele jogou.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Heimerdinger_0.jpg'
  },
  { 
    name: 'Tsunami de Skin', 
    description: 'Todo o time deve usar skins da mesma temática (ex: Velho Oeste, Fliperama).',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lucian_9.jpg'
  },
  { 
    name: 'Safari de Runeterra', 
    description: 'Só é permitido escolher campeões que sejam animais ou feras.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Warwick_0.jpg'
  },
  { 
    name: 'Vovô tá On', 
    description: 'Os players devem jogar apenas com campeões idosos ou milenares.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zilean_0.jpg'
  },
  { 
    name: 'Exército de um Homem Só', 
    description: 'O time todo deve buildar o item Coração de Aço, não importa o boneco.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Sion_0.jpg'
  },
  { 
    name: 'Clube da Luluzinha', 
    description: 'Só é permitido jogar com personagens femininas.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lux_0.jpg'
  },
  { 
    name: 'Baile de Máscaras', 
    description: 'Os players devem escolher apenas campeões que usem máscara ou escondam o rosto.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Jhin_0.jpg'
  },
  { 
    name: 'Só os Marombeiros', 
    description: 'Apenas campeões que lutam "no soco" ou que sejam visivelmente musculosos.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Sett_0.jpg'
  },
  { 
    name: 'Azul da Cor do Mar', 
    description: 'Os players devem jogar apenas com campeões que tenham a cor azul predominante.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Fizz_0.jpg'
  },
  { 
    name: 'Toca o Berrante!', 
    description: 'O time deve jogar com campeões que possuam chifres.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Alistar_0.jpg'
  },
  { 
    name: 'Abaixo de Zero', 
    description: 'Só pode ser escolhido campeões que usem gelo ou venham de Freljord.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Anivia_0.jpg'
  },
  { 
    name: 'Invasão do Vazio', 
    description: 'Os players devem jogar apenas com campeões vindos do Vazio.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Khazix_0.jpg'
  },
  { 
    name: 'Bonde dos Baixinhos', 
    description: 'Só é permitido escolher campeões da raça Yordle.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Teemo_0.jpg'
  },
  { 
    name: 'O Amor está no Ar', 
    description: 'O time deve ser composto apenas por casais ou personagens que tenham "shipps" famosos.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Xayah_0.jpg'
  },
  { 
    name: 'Luz, Câmera, Ação!', 
    description: 'Os players devem jogar apenas com campeões que usam magia de luz ou brilham muito.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lux_0.jpg'
  },
  { 
    name: 'Ferro Velho', 
    description: 'Apenas campeões que sejam robôs, ciborgues ou feitos de metal.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Blitzcrank_0.jpg'
  },
  { 
    name: 'Tudo no Sigilo', 
    description: 'Só pode ser escolhido campeões que tenham algum tipo de invisibilidade ou camuflagem.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Evelynn_0.jpg'
  },
  { 
    name: 'Reino das Sombras', 
    description: 'Os players devem jogar apenas com campeões da Ilha das Sombras ou que sejam fantasmas.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Hecarim_0.jpg'
  },
  { 
    name: 'Sem Polegar Opositor', 
    description: 'Só vale jogar com campeões que não são humanos e não têm mãos humanas (patas, garras, tentáculos).',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Velkoz_0.jpg'
  },
  { 
    name: 'A Era de Ouro', 
    description: 'Todo o time deve buildar a Ampulheta de Zhonya como primeiro ou segundo item.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Bard_0.jpg'
  },
  { 
    name: 'Piratas do Caribe', 
    description: 'Os players devem jogar apenas com campeões de Águas de Sentina.',
    imageUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Gangplank_0.jpg'
  },
];

const PLAYER_MODS_DATA = {
  personagens: [
    { name: "Aatrox", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aatrox_0.jpg" },
    { name: "Ahri", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg" },
    { name: "Akali", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Akali_0.jpg" },
    { name: "Akshan", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Akshan_0.jpg" },
    { name: "Alistar", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Alistar_0.jpg" },
    { name: "Ambessa", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ambessa_0.jpg" },
    { name: "Amumu", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Amumu_0.jpg" },
    { name: "Anivia", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Anivia_0.jpg" },
    { name: "Annie", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Annie_0.jpg" },
    { name: "Aphelios", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aphelios_0.jpg" },
    { name: "Ashe", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ashe_0.jpg" },
    { name: "Aurelion Sol", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/AurelionSol_0.jpg" },
    { name: "Aurora", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aurora_0.jpg" },
    { name: "Azir", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Azir_0.jpg" },
    { name: "Bardo", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Bard_0.jpg" },
    { name: "Bel'Veth", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Belveth_0.jpg" },
    { name: "Blitzcrank", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Blitzcrank_0.jpg" },
    { name: "Brand", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Brand_0.jpg" },
    { name: "Braum", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Braum_0.jpg" },
    { name: "Briar", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Briar_0.jpg" },
    { name: "Caitlyn", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Caitlyn_0.jpg" },
    { name: "Camille", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Camille_0.jpg" },
    { name: "Cassiopeia", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Cassiopeia_0.jpg" },
    { name: "Cho'Gath", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Chogath_0.jpg" },
    { name: "Corki", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Corki_0.jpg" },
    { name: "Darius", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Darius_0.jpg" },
    { name: "Diana", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Diana_0.jpg" },
    { name: "Dr. Mundo", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/DrMundo_0.jpg" },
    { name: "Draven", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Draven_0.jpg" },
    { name: "Ekko", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ekko_0.jpg" },
    { name: "Elise", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Elise_0.jpg" },
    { name: "Evelynn", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Evelynn_0.jpg" },
    { name: "Ezreal", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ezreal_0.jpg" },
    { name: "Fiddlesticks", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Fiddlesticks_0.jpg" },
    { name: "Fiora", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Fiora_0.jpg" },
    { name: "Fizz", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Fizz_0.jpg" },
    { name: "Galio", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Galio_0.jpg" },
    { name: "Gangplank", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Gangplank_0.jpg" },
    { name: "Garen", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Garen_0.jpg" },
    { name: "Gnar", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Gnar_0.jpg" },
    { name: "Gragas", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Gragas_0.jpg" },
    { name: "Graves", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Graves_0.jpg" },
    { name: "Gwen", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Gwen_0.jpg" },
    { name: "Hecarim", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Hecarim_0.jpg" },
    { name: "Heimerdinger", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Heimerdinger_0.jpg" },
    { name: "Hwei", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Hwei_0.jpg" },
    { name: "Illaoi", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Illaoi_0.jpg" },
    { name: "Irelia", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Irelia_0.jpg" },
    { name: "Ivern", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ivern_0.jpg" },
    { name: "Janna", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Janna_0.jpg" },
    { name: "Jarvan IV", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/JarvanIV_0.jpg" },
    { name: "Jax", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Jax_0.jpg" },
    { name: "Jayce", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Jayce_0.jpg" },
    { name: "Jhin", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Jhin_0.jpg" },
    { name: "Jinx", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Jinx_0.jpg" },
    { name: "K'Sante", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ksante_0.jpg" },
    { name: "Kai'Sa", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kaisa_0.jpg" },
    { name: "Kalista", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kalista_0.jpg" },
    { name: "Karma", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Karma_0.jpg" },
    { name: "Karthus", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Karthus_0.jpg" },
    { name: "Kassadin", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kassadin_0.jpg" },
    { name: "Katarina", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Katarina_0.jpg" },
    { name: "Kayle", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kayle_0.jpg" },
    { name: "Kayn", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kayn_0.jpg" },
    { name: "Kennen", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kennen_0.jpg" },
    { name: "Kha'Zix", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Khazix_0.jpg" },
    { name: "Kindred", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kindred_0.jpg" },
    { name: "Kled", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kled_0.jpg" },
    { name: "Kog'Maw", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/KogMaw_0.jpg" },
    { name: "LeBlanc", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Leblanc_0.jpg" },
    { name: "Lee Sin", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/LeeSin_0.jpg" },
    { name: "Leona", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Leona_0.jpg" },
    { name: "Lillia", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lillia_0.jpg" },
    { name: "Lissandra", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lissandra_0.jpg" },
    { name: "Lucian", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lucian_0.jpg" },
    { name: "Lulu", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lulu_0.jpg" },
    { name: "Lux", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lux_0.jpg" },
    { name: "Malphite", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Malphite_0.jpg" },
    { name: "Malzahar", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Malzahar_0.jpg" },
    { name: "Maokai", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Maokai_0.jpg" },
    { name: "Master Yi", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/MasterYi_0.jpg" },
    { name: "Mel Medarda", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Mel_0.jpg" },
    { name: "Milio", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Milio_0.jpg" },
    { name: "Miss Fortune", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/MissFortune_0.jpg" },
    { name: "Mordekaiser", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Mordekaiser_0.jpg" },
    { name: "Morgana", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Morgana_0.jpg" },
    { name: "Naafiri", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Naafiri_0.jpg" },
    { name: "Nami", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Nami_0.jpg" },
    { name: "Nasus", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Nasus_0.jpg" },
    { name: "Nautilus", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Nautilus_0.jpg" },
    { name: "Neeko", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Neeko_0.jpg" },
    { name: "Nidalee", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Nidalee_0.jpg" },
    { name: "Nilah", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Nilah_0.jpg" },
    { name: "Nocturne", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Nocturne_0.jpg" },
    { name: "Nunu e Willump", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Nunu_0.jpg" },
    { name: "Olaf", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Olaf_0.jpg" },
    { name: "Orianna", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Orianna_0.jpg" },
    { name: "Ornn", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ornn_0.jpg" },
    { name: "Pantheon", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Pantheon_0.jpg" },
    { name: "Poppy", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Poppy_0.jpg" },
    { name: "Pyke", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Pyke_0.jpg" },
    { name: "Qiyana", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Qiyana_0.jpg" },
    { name: "Quinn", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Quinn_0.jpg" },
    { name: "Rakan", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Rakan_0.jpg" },
    { name: "Rammus", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Rammus_0.jpg" },
    { name: "Rek'Sai", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/RekSai_0.jpg" },
    { name: "Rell", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Rell_0.jpg" },
    { name: "Renata Glasc", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Renata_0.jpg" },
    { name: "Renekton", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Renekton_0.jpg" },
    { name: "Rengar", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Rengar_0.jpg" },
    { name: "Riven", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Riven_0.jpg" },
    { name: "Rumble", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Rumble_0.jpg" },
    { name: "Ryze", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ryze_0.jpg" },
    { name: "Samira", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Samira_0.jpg" },
    { name: "Sejuani", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Sejuani_0.jpg" },
    { name: "Senna", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Senna_0.jpg" },
    { name: "Seraphine", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Seraphine_0.jpg" },
    { name: "Sett", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Sett_0.jpg" },
    { name: "Shaco", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Shaco_0.jpg" },
    { name: "Shen", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Shen_0.jpg" },
    { name: "Shyvana", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Shyvana_0.jpg" },
    { name: "Singed", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Singed_0.jpg" },
    { name: "Sion", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Sion_0.jpg" },
    { name: "Sivir", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Sivir_0.jpg" },
    { name: "Skarner", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Skarner_0.jpg" },
    { name: "Smolder", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Smolder_0.jpg" },
    { name: "Sona", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Sona_0.jpg" },
    { name: "Soraka", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Soraka_0.jpg" },
    { name: "Swain", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Swain_0.jpg" },
    { name: "Sylas", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Sylas_0.jpg" },
    { name: "Syndra", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Syndra_0.jpg" },
    { name: "Tahm Kench", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/TahmKench_0.jpg" },
    { name: "Taliyah", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Taliyah_0.jpg" },
    { name: "Talon", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Talon_0.jpg" },
    { name: "Taric", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Taric_0.jpg" },
    { name: "Teemo", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Teemo_0.jpg" },
    { name: "Thresh", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Thresh_0.jpg" },
    { name: "Tristana", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Tristana_0.jpg" },
    { name: "Trundle", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Trundle_0.jpg" },
    { name: "Tryndamere", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Tryndamere_0.jpg" },
    { name: "Twisted Fate", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/TwistedFate_0.jpg" },
    { name: "Twitch", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Twitch_0.jpg" },
    { name: "Udyr", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Udyr_0.jpg" },
    { name: "Urgot", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Urgot_0.jpg" },
    { name: "Varus", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Varus_0.jpg" },
    { name: "Vayne", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Vayne_0.jpg" },
    { name: "Veigar", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Veigar_0.jpg" },
    { name: "Vel'Koz", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Velkoz_0.jpg" },
    { name: "Vex", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Vex_0.jpg" },
    { name: "Vi", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Vi_0.jpg" },
    { name: "Viego", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Viego_0.jpg" },
    { name: "Viktor", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Viktor_0.jpg" },
    { name: "Vladimir", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Vladimir_0.jpg" },
    { name: "Volibear", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Volibear_0.jpg" },
    { name: "Warwick", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Warwick_0.jpg" },
    { name: "Wukong", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/MonkeyKing_0.jpg" },
    { name: "Xayah", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Xayah_0.jpg" },
    { name: "Xerath", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Xerath_0.jpg" },
    { name: "Xin Zhao", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/XinZhao_0.jpg" },
    { name: "Yasuo", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yasuo_0.jpg" },
    { name: "Yone", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yone_0.jpg" },
    { name: "Yorick", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yorick_0.jpg" },
    { name: "Yuumi", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yuumi_0.jpg" },
    { name: "Yunara", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yunara_0.jpg" },
    { name: "Zaahen", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zaahen_0.jpg" },
    { name: "Zac", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zac_0.jpg" },
    { name: "Zed", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zed_0.jpg" },
    { name: "Zeri", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zeri_0.jpg" },
    { name: "Ziggs", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ziggs_0.jpg" },
    { name: "Zilean", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zilean_0.jpg" },
    { name: "Zoe", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zoe_0.jpg" },
    { name: "Zyra", imageUrl: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zyra_0.jpg" }
  ],
  builds: [
    "On-Hit (Ao Contato)",
    "Letalidade",
    "Penetração de Armadura Porcentual",
    "Poke / Habilidade",
    "Burst AP",
    "Burn (Queimadura)",
    "AP Bruiser",
    "Dano Sustentado AP",
    "Full Armor (Full Armadura)",
    "Full MR (Resistência Mágica)",
    "Full Vida (HP Stack)",
    "Drain Tank",
    "Enchanter (Encantador)",
    "Híbrida",
    "Movimentação (Speed)",
    "HP para AD (Sinergia Hidra Titânica)",
    "HP para AP (Sinergia Criafendas)",
    "Armor-Scaling (Armadura em Dano)",
    "MR-Scaling (Resistência Mágica em Dano)",
    "Mana para AD (Manamune/Muramana)",
    "Mana para AP/Escudo (Seraph/Cajado do Arcanjo)",
    "Infinite Scaling (Acúmulo Infinito)"
  ],
  lanes: ["Top", "Mid", "Adc", "Sup", "Jungler"],
  eventos: ["Double Kill", "Triple Kill", "Quadra Kill", "Penta Kill", "Solo Baron", "Backdoor", "Lendário", "Implacável", "First Blood", "Roubo de Dragão"]
};

const FUNNY_PLACEHOLDERS = [
  "https://i.imgflip.com/1ur9b0.jpg",
  "https://i.imgflip.com/26am.jpg",
  "https://i.imgflip.com/1bij.jpg",
  "https://i.imgflip.com/4t0m5.jpg",
  "https://i.imgflip.com/9ehk.jpg",
  "https://i.imgflip.com/1v96.jpg"
];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register_player', ({ playerId }) => {
    playerSockets.set(playerId, socket.id);
    socketPlayers.set(socket.id, playerId);
    console.log(`Player registered: ${playerId} -> ${socket.id}`);
  });

  socket.on('create_room', ({ playerName, playerImage, playerId }) => {
    if (!playerId) return socket.emit('error_msg', 'Player ID missing.');
    const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const finalImage = playerImage || FUNNY_PLACEHOLDERS[Math.floor(Math.random() * FUNNY_PLACEHOLDERS.length)];
    const room = {
      roomId,
      creatorId: playerId,
      status: 'waiting',
      players: [{ id: playerId, name: playerName, imageUrl: finalImage, tags: [], playerResult: null, totalPoints: 0, verified: false }],
      presidentId: null,
      currentMods: [],
      isDoubleRound: false,
      nextRoundDouble: false,
      eventTriggered: false
    };
    rooms.set(roomId, room);
    saveRooms();
    socket.join(roomId);
    socket.emit('room_created', roomId);
    io.to(roomId).emit('room_update', room);
  });

  socket.on('join_room', ({ roomId, playerName, playerImage, playerId }) => {
    if (!playerId) return socket.emit('error_msg', 'Player ID missing.');
    const room = rooms.get(roomId);
    if (!room) {
      return socket.emit('error_msg', 'Sala não encontrada.');
    }

    // Se o jogador já está na sala, permite re-entrada mesmo se estiver bloqueada
    const existingPlayer = room.players.find(p => p.id === playerId);
    if (existingPlayer) {
      playerSockets.set(playerId, socket.id);
      socketPlayers.set(socket.id, playerId);
      socket.join(roomId);
      console.log(`Player ${playerId} re-joined via join_room for room ${roomId}`);
      return io.to(roomId).emit('room_update', room);
    }

    if (room.status !== 'waiting') {
      return socket.emit('error_msg', 'Sala bloqueada. A partida já iniciou.');
    }
    
    const finalImage = playerImage || FUNNY_PLACEHOLDERS[Math.floor(Math.random() * FUNNY_PLACEHOLDERS.length)];
    room.players.push({ id: playerId, name: playerName, imageUrl: finalImage, tags: [], playerResult: null, totalPoints: 0, verified: false });
    saveRooms();
    socket.join(roomId);
    io.to(roomId).emit('room_update', room);
  });

  socket.on('rejoin_room', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        playerSockets.set(playerId, socket.id);
        socketPlayers.set(socket.id, playerId);
        socket.join(roomId);
        console.log(`Player ${playerId} rejoined room ${roomId}`);
        socket.emit('room_update', room);
      } else {
        socket.emit('rejoin_failed', 'Jogador não encontrado na sala.');
      }
    } else {
      socket.emit('rejoin_failed', 'Sala não encontrada.');
    }
  });

  socket.on('start_president_spin', ({ roomId }) => {
    const room = rooms.get(roomId);
    const playerId = socketPlayers.get(socket.id);
    if (room && playerId === room.creatorId) {
      const winner = room.players[Math.floor(Math.random() * room.players.length)];
      room.status = 'spinning_president';
      io.to(roomId).emit('room_update', room);
      io.to(roomId).emit('president_spin_start', { winnerId: winner.id });
      saveRooms();
    }
  });

  socket.on('president_spin_end', ({ roomId, winnerId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.presidentId = winnerId;
      console.log(`President spin ended for room ${roomId}, winner: ${winnerId}`);
      // 20% de chance de evento "Dobra ou Arrega"
      const isEvent = Math.random() < 0.20;
      if (isEvent) {
        room.status = 'event_dobra_arrega';
        room.eventTriggered = true;
      } else {
        room.status = 'spinning_mod_step';
      }
      io.to(roomId).emit('room_update', room);
      saveRooms();
    }
  });

  socket.on('choose_dobra_arrega', ({ roomId, choice }) => {
    const room = rooms.get(roomId);
    const playerId = socketPlayers.get(socket.id);
    if (room && playerId === room.presidentId) {
      console.log(`President ${playerId} choice in room ${roomId}: ${choice}`);
      const president = room.players.find(p => p.id === playerId);
      if (choice === 'dobrar') {
        room.isDoubleRound = true;
        room.nextRoundDouble = true;
        if (president && !president.tags.includes('Aí tem coragem')) {
          president.tags.push('Aí tem coragem');
        }
        room.status = 'spinning_mod_step';
      } else {
        if (president && !president.tags.includes('arregão')) {
          president.tags.push('arregão');
        }
        room.status = 'spinning_mod_step';
      }
      io.to(roomId).emit('room_update', room);
      saveRooms();
    }
  });

  socket.on('start_mod_spin', ({ roomId }) => {
    const room = rooms.get(roomId);
    const playerId = socketPlayers.get(socket.id);
    if (room && playerId === room.presidentId) {
      const numMods = room.isDoubleRound ? 2 : 1;
      const selectedMods = [...MODS].sort(() => 0.5 - Math.random()).slice(0, numMods);
      room.status = 'spinning_mod';
      io.to(roomId).emit('room_update', room);
      io.to(roomId).emit('mod_spin_start', { selectedMods });
      saveRooms();
    }
  });

  socket.on('mod_spin_end', ({ roomId, selectedMods }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.currentMods = selectedMods;
      room.status = 'players_round';
      io.to(roomId).emit('room_update', room);
      saveRooms();
    }
  });

  socket.on('submit_player_choice', ({ roomId, mode, config }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const playerId = socketPlayers.get(socket.id);
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    let result = { mode, points: 0, details: {} };

    if (mode === 'Personagem') {
      const charObj = PLAYER_MODS_DATA.personagens[Math.floor(Math.random() * PLAYER_MODS_DATA.personagens.length)];
      result.points = 3;
      result.details.char = charObj.name;
      result.details.imageUrl = charObj.imageUrl;
      if (config.useBuild) {
        result.details.build = PLAYER_MODS_DATA.builds[Math.floor(Math.random() * PLAYER_MODS_DATA.builds.length)];
        result.points += 2;
      }
      if (config.useLane) {
        result.details.lane = PLAYER_MODS_DATA.lanes[Math.floor(Math.random() * PLAYER_MODS_DATA.lanes.length)];
        result.points += 2;
      }
    } else if (mode === 'Evento') {
      const qty = Math.min(Math.max(config.qty || 1, 1), 5);
      const shuffled = [...PLAYER_MODS_DATA.eventos].sort(() => 0.5 - Math.random());
      result.details.events = shuffled.slice(0, qty);
      result.points = qty * 2;
    } else if (mode === 'KDA') {
      const k = Math.floor(Math.random() * 11); // 0 a 10 kills
      const d = Math.floor(Math.random() * 11); // 0 a 10 deaths
      const effectiveDeaths = d === 0 ? 1 : d;
      const kda = k / effectiveDeaths;
      
      result.details.k = k;
      result.details.d = d;
      result.details.kda = kda.toFixed(2);
      result.points = Math.round(kda * 2); // Pontuação = 2 * KDA, arredondado para facilitar
    }

    player.playerResult = result;
    io.to(roomId).emit('room_update', room);
    saveRooms();
  });

  socket.on('finish_players_round', ({ roomId }) => {
    const room = rooms.get(roomId);
    const playerId = socketPlayers.get(socket.id);
    if (room && playerId === room.creatorId) {
      room.status = 'playing';
      io.to(roomId).emit('room_update', room);
      saveRooms();
    }
  });

  socket.on('reset_match', ({ roomId }) => {
    const room = rooms.get(roomId);
    const playerId = socketPlayers.get(socket.id);
    if (room && playerId === room.creatorId) {
      room.status = 'verifying';
      room.players.forEach(p => p.verified = false);
      io.to(roomId).emit('room_update', room);
      saveRooms();
    }
  });

  socket.on('verify_result', ({ roomId, success }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const playerId = socketPlayers.get(socket.id);
    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.playerResult || player.verified) return;

    if (success) {
      player.totalPoints = (player.totalPoints || 0) + player.playerResult.points;
    } else {
      player.totalPoints = (player.totalPoints || 0) - Math.floor(player.playerResult.points / 2);
    }
    player.verified = true;
    io.to(roomId).emit('room_update', room);
    saveRooms();
  });

  socket.on('finish_verification', ({ roomId }) => {
    const room = rooms.get(roomId);
    const playerId = socketPlayers.get(socket.id);
    if (room && playerId === room.creatorId) {
      room.status = 'waiting';
      room.presidentId = null;
      room.currentMods = [];
      room.eventTriggered = false;
      
      // Reset players results
      room.players.forEach(p => {
        p.playerResult = null;
        p.verified = false;
      });

      // Lógica de rodada em dobro
      room.isDoubleRound = room.nextRoundDouble;
      room.nextRoundDouble = false; 

      io.to(roomId).emit('room_update', room);
      saveRooms();
    }
  });

  socket.on('ping_keep_alive', ({ roomId }) => {
    // Ping recebido para evitar que o servidor entre em suspensão
    console.log(`Keep-alive ping received for room: ${roomId}`);
  });

  socket.on('disconnect', () => {
    const playerId = socketPlayers.get(socket.id);
    console.log('User disconnected:', socket.id, 'Player:', playerId);
    
    if (playerId) {
      playerSockets.delete(playerId);
      socketPlayers.delete(socket.id);

      for (const [roomId, room] of rooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
          // Se estiver esperando, remove o jogador. Se estiver jogando, mantém.
          if (room.status === 'waiting') {
            room.players.splice(playerIndex, 1);
            if (room.players.length === 0) {
              rooms.delete(roomId);
            } else {
              if (room.creatorId === playerId) {
                // Transfere liderança para o próximo disponível
                room.creatorId = room.players[0].id;
              }
              io.to(roomId).emit('room_update', room);
            }
          } else {
            // Se o criador desconectar durante o jogo, transfere liderança para alguém online
            if (room.creatorId === playerId) {
              const nextOnline = room.players.find(p => playerSockets.has(p.id));
              if (nextOnline) {
                room.creatorId = nextOnline.id;
                console.log(`Leadership transferred from ${playerId} to ${nextOnline.id} in room ${roomId}`);
                io.to(roomId).emit('room_update', room);
              }
            }
          }
          saveRooms();
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
