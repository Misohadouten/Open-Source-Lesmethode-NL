export type BronType = 'Website' | 'Tool' | 'Database';

export interface Bron {
  id: string;
  titel: string;
  omschrijving: string;
  categorie: string;
  type: BronType;
  url: string;
}

export const BRONNEN: Bron[] = [
  {
    id: 'nieuwsbegrip',
    titel: 'Nieuwsbegrip',
    omschrijving: 'Wekelijks nieuws en achtergrondartikelen op verschillende taalniveaus, geschikt voor begrijpend lezen en discussie in de klas.',
    categorie: 'Nieuws & Actualiteit',
    type: 'Website',
    url: 'https://www.nieuwsbegrip.nl/',
  },
  {
    id: 'wikikids',
    titel: 'WikiKids',
    omschrijving: 'Online encyclopedie voor kinderen; bruikbaar voor onderzoeksopdrachten, woordenschat en samenvattend schrijven.',
    categorie: 'Taal & Nederlands',
    type: 'Website',
    url: 'https://wikikids.nl/',
  },
  {
    id: 'schooltv',
    titel: 'Schooltv',
    omschrijving: 'Onderwijsgerichte video\'s, series en clips voor PO, VO en MBO met aansluiting op kerndoelen en actualiteit.',
    categorie: 'Mediawijsheid',
    type: 'Website',
    url: 'https://www.schooltv.nl/',
  },
  {
    id: 'digitale-geletterdheid',
    titel: 'Digitale geletterdheid (SLO)',
    omschrijving: 'Kader en handvatten voor digitale geletterdheid in het onderwijs, inclusief voorbeelden per leergebied.',
    categorie: 'Digitaal & ICT',
    type: 'Website',
    url: 'https://www.slo.nl/onderwijsadvies/digitale-geletterdheid/',
  },
  {
    id: 'lezen',
    titel: 'Stichting Lezen',
    omschrijving: 'Inspiratie, onderzoek en materialen om leesmotivatie en leesvaardigheid te versterken.',
    categorie: 'Bibliotheek & Literatuur',
    type: 'Website',
    url: 'https://www.stichting-lezen.nl/',
  },
  {
    id: 'kb-literatuur',
    titel: 'Koninklijke Bibliotheek – Literatuuronderwijs',
    omschrijving: 'Achtergrond bij literatuur, auteurs en leestips voor het voortgezet onderwijs.',
    categorie: 'Bibliotheek & Literatuur',
    type: 'Website',
    url: 'https://www.kb.nl/onderwijs',
  },
  {
    id: 'oneworld',
    titel: 'OneWorld',
    omschrijving: 'Artikelen en dossiers over duurzaamheid, mensenrechten en wereldproblematiek voor burgerschapsonderwijs.',
    categorie: 'Wereldburgerschap',
    type: 'Website',
    url: 'https://www.oneworld.nl/',
  },
  {
    id: 'ishetb1',
    titel: 'IshetB1.nl',
    omschrijving: 'Controleer of teksten voldoen aan taalniveau B1; handig bij NT2 en toegankelijk lesmateriaal.',
    categorie: 'Taal & Nederlands',
    type: 'Tool',
    url: 'https://www.ishetb1.nl/',
  },
  {
    id: 'talenlab',
    titel: 'Talenlab',
    omschrijving: 'Oefeningen en uitleg voor spelling, grammatica en woordenschat in het Nederlands.',
    categorie: 'Taal & Nederlands',
    type: 'Website',
    url: 'https://www.talenlab.nl/',
  },
  {
    id: 'nieuwkomers',
    titel: 'Moedertaal en Nieuwkomers',
    omschrijving: 'Praktische tips en kennisclips voor taalonderwijs aan nieuwkomers en meertalige leerlingen.',
    categorie: 'Taal & Nederlands',
    type: 'Website',
    url: 'https://www.moedertaalennieuwkomers.nl/',
  },
  {
    id: 'mediawijsheid',
    titel: 'Mediawijsheid.nl',
    omschrijving: 'Lessen, tools en handreikingen over nepnieuws, privacy, sociale media en kritisch kijken.',
    categorie: 'Mediawijsheid',
    type: 'Website',
    url: 'https://www.mediawijsheid.nl/',
  },
  {
    id: 'wikiwijs',
    titel: 'Wikiwijs',
    omschrijving: 'Open lesmateriaal van docenten, doorzoekbaar op vak, niveau en leerdoel.',
    categorie: 'Methode & Didactiek',
    type: 'Database',
    url: 'https://www.wikiwijsleermiddelenplein.nl/',
  },
  {
    id: 'biblionet',
    titel: 'Biblionet',
    omschrijving: 'Informatie over boeken, auteurs en leeslijsten; ondersteunt literatuuronderwijs en leesbevordering.',
    categorie: 'Bibliotheek & Literatuur',
    type: 'Database',
    url: 'https://www.biblionet.nl/',
  },
  {
    id: 'canva-edu',
    titel: 'Canva for Education',
    omschrijving: 'Ontwerp posters, presentaties en werkbladen; geschikt voor visuele activatie en opdrachten.',
    categorie: 'Digitaal & ICT',
    type: 'Tool',
    url: 'https://www.canva.com/education/',
  },
  {
    id: 'mentimeter',
    titel: 'Mentimeter',
    omschrijving: 'Live polls en woordwolken in de les voor participatie en formatieve terugkoppeling.',
    categorie: 'Methode & Didactiek',
    type: 'Tool',
    url: 'https://www.mentimeter.com/',
  },
];

export const BRON_CATEGORIEEN = [
  'Taal & Nederlands',
  'Nieuws & Actualiteit',
  'Mediawijsheid',
  'Wereldburgerschap',
  'Digitaal & ICT',
  'Methode & Didactiek',
  'Bibliotheek & Literatuur',
] as const;

export const BRON_TYPES: BronType[] = ['Website', 'Tool', 'Database'];
