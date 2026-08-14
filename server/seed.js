import { RolodexRepo } from './repo';
import { formatDateISO, addDays } from '../shared/cadence';
// Clean SVG avatar helper to provide crisp local SVG data URLs for photos
function createAvatarSvg(initials, bgColor, fgColor = '#ffffff') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" rx="50" fill="${bgColor}"/>
    <text x="50%" y="54%" font-family="Inter, -apple-system, sans-serif" font-size="38" font-weight="600" fill="${fgColor}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
export function seedDatabase(db, force = false) {
    const repo = new RolodexRepo(db);
    const existingCount = db.prepare(`SELECT COUNT(*) as count FROM people`).get().count;
    if (existingCount > 0 && !force) {
        return;
    }
    // Clear existing if forcing
    if (force) {
        db.exec(`
      DELETE FROM connections;
      DELETE FROM gifts;
      DELETE FROM reminders;
      DELETE FROM news;
      DELETE FROM facts;
      DELETE FROM important_dates;
      DELETE FROM interactions;
      DELETE FROM people;
    `);
    }
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();
    // Helper for relative dates
    const daysAgo = (n) => formatDateISO(addDays(today, -n));
    const daysAhead = (n) => formatDateISO(addDays(today, n));
    // 35 realistic, diverse sample people across all 4 circles
    const peopleData = [
        // --- INNER CIRCLE (Monthly check-in) ---
        {
            id: 'p1',
            name: 'Elena Rostova',
            photo_url: createAvatarSvg('ER', '#209dd7'),
            email: 'elena.rostova@designlab.io',
            phone: '+44 7700 900123',
            job_title: 'Head of Product Design',
            company: 'DesignLab Studio',
            city: 'London',
            time_zone: 'Europe/London',
            circle: 'inner',
            how_we_met: 'Met at University of Cambridge during freshman week in 2014.',
            notes: 'Best friend since college. Always has brilliant book recommendations and loves specialty filter coffee.',
            tags: ['university', 'best-friend', 'design', 'london'],
        },
        {
            id: 'p2',
            name: 'Marcus Vance',
            photo_url: createAvatarSvg('MV', '#ecad0a'),
            email: 'marcus.vance@techventures.co',
            phone: '+1 (415) 890-1234',
            job_title: 'Staff Software Architect',
            company: 'Stripe',
            city: 'San Francisco',
            time_zone: 'America/Los_Angeles',
            circle: 'inner',
            how_we_met: 'Co-worked on an open source database project in 2018.',
            notes: 'Loves rock climbing in Yosemite and brewing artisanal IPAs. Currently building distributed systems.',
            tags: ['tech', 'open-source', 'climbing', 'san-francisco'],
        },
        {
            id: 'p3',
            name: 'Maya Lin Chen',
            photo_url: null, // Test initials fallback
            email: 'maya.chen@biomed-innovations.org',
            phone: '+1 (617) 555-0198',
            job_title: 'Principal Research Scientist',
            company: 'Broad Institute',
            city: 'Boston',
            time_zone: 'America/New_York',
            circle: 'inner',
            how_we_met: 'Childhood friend from neighbourhood growing up.',
            notes: 'Working on CRISPR gene-editing research. Avid marathon runner.',
            tags: ['childhood', 'family-friend', 'running', 'boston'],
        },
        {
            id: 'p4',
            name: 'Samir Al-Mansoor',
            photo_url: createAvatarSvg('SA', '#753991'),
            email: 'samir.almansoor@soundpulse.fm',
            phone: '+49 30 901820',
            job_title: 'Creative Audio Director',
            company: 'SoundPulse Studios',
            city: 'Berlin',
            time_zone: 'Europe/Berlin',
            circle: 'inner',
            how_we_met: 'Met at a sound design meetup in Kreuzberg.',
            notes: 'Synthesizer collector and modular synth enthusiast. Has two rescue cats.',
            tags: ['music', 'berlin', 'creative'],
        },
        {
            id: 'p5',
            name: 'Sarah Jenkins',
            photo_url: createAvatarSvg('SJ', '#209dd7'),
            email: 'sarah.jenkins@family.net',
            phone: '+44 7911 123456',
            job_title: 'Consultant Paediatrician',
            company: "St. Thomas' Hospital",
            city: 'London',
            time_zone: 'Europe/London',
            circle: 'inner',
            cadence_override_days: 14, // Custom override: every 2 weeks
            how_we_met: 'Sister.',
            notes: 'My older sister. Call on Sunday afternoons when she finishes ward rounds.',
            tags: ['family', 'sister', 'london'],
        },
        {
            id: 'p6',
            name: 'Tom Jenkins',
            photo_url: null, // initials fallback
            email: 'tom.jenkins@gardenscapes.co.uk',
            phone: '+44 7922 654321',
            job_title: 'Landscape Architect',
            company: 'GardenScapes UK',
            city: 'Oxford',
            time_zone: 'Europe/London',
            circle: 'inner',
            snooze_until: daysAhead(14), // Snoozed for 2 weeks
            how_we_met: 'Brother-in-law (married to Sarah).',
            notes: 'Currently travelling in New Zealand for garden design projects until end of month.',
            tags: ['family', 'gardening', 'oxford'],
        },
        {
            id: 'p7',
            name: 'Chloe Dubois',
            photo_url: createAvatarSvg('CD', '#ecad0a'),
            email: 'chloe.dubois@parislit.fr',
            phone: '+33 1 42 68 55 00',
            job_title: 'Senior Literary Editor',
            company: 'Editions Gallimard',
            city: 'Paris',
            time_zone: 'Europe/Paris',
            circle: 'inner',
            how_we_met: 'Met while studying literature abroad in Sorbonne.',
            notes: 'Obsessed with antique typewriters and vintage espresso machines.',
            tags: ['university', 'books', 'paris'],
        },
        // --- CLOSE CIRCLE (Quarterly check-in / 90 days) ---
        {
            id: 'p8',
            name: 'David Okafor',
            photo_url: createAvatarSvg('DO', '#753991'),
            email: 'david.okafor@africavc.fund',
            phone: '+234 802 123 4567',
            job_title: 'General Partner',
            company: 'EchoVC Partners',
            city: 'Lagos',
            time_zone: 'Africa/Lagos',
            circle: 'close',
            how_we_met: 'Met at Africa Tech Summit in Nairobi 2021.',
            notes: 'Backing early stage fintech founders across Sub-Saharan Africa. Passionate chess player.',
            tags: ['fintech', 'investor', 'chess', 'lagos'],
        },
        {
            id: 'p9',
            name: 'Hannah Weber',
            photo_url: createAvatarSvg('HW', '#209dd7'),
            email: 'hannah.weber@urbanmobility.de',
            phone: '+49 89 218070',
            job_title: 'VP Engineering',
            company: 'NextBike Systems',
            city: 'Munich',
            time_zone: 'Europe/Berlin',
            circle: 'close',
            how_we_met: 'Worked together at Siemens 2017-2020.',
            notes: 'Exceptional engineering leader. Enjoys Alpine hiking and gravel biking.',
            tags: ['ex-colleague', 'cycling', 'hiking', 'munich'],
        },
        {
            id: 'p10',
            name: 'Liam O’Connor',
            photo_url: null, // initials fallback
            email: 'liam.oconnor@dublindev.ie',
            phone: '+353 1 496 0000',
            job_title: 'Director of Product',
            company: 'Intercom',
            city: 'Dublin',
            time_zone: 'Europe/Dublin',
            circle: 'close',
            how_we_met: 'Met at SaaStr Europe conference in 2019.',
            notes: 'Expert on customer onboarding and PLG. Plays traditional Irish fiddle.',
            tags: ['product', 'saas', 'music', 'dublin'],
        },
        {
            id: 'p11',
            name: 'Yuki Tanaka',
            photo_url: createAvatarSvg('YT', '#ecad0a'),
            email: 'yuki.tanaka@tokyo-robotics.jp',
            phone: '+81 3 5555 0143',
            job_title: 'Lead Robotics Engineer',
            company: 'Preferred Networks',
            city: 'Tokyo',
            time_zone: 'Asia/Tokyo',
            circle: 'close',
            how_we_met: 'Met at IEEE ICRA conference in Montreal.',
            notes: 'Specialises in autonomous warehouse robotics. Great guide to culinary Tokyo.',
            tags: ['robotics', 'ai', 'tokyo'],
        },
        {
            id: 'p12',
            name: 'Carlos Mendoza',
            photo_url: createAvatarSvg('CM', '#753991'),
            email: 'carlos.mendoza@latamdesign.co',
            phone: '+52 55 5200 1234',
            job_title: 'Design Director',
            company: 'Estudio Mendoza',
            city: 'Mexico City',
            time_zone: 'America/Mexico_City',
            circle: 'close',
            how_we_met: 'Collaborated on brand identity for a joint client in 2022.',
            notes: 'Loves mezcal tasting, modernist architecture, and printmaking.',
            tags: ['design', 'mexico-city', 'art'],
        },
        {
            id: 'p13',
            name: 'Aisha Patel',
            photo_url: null, // initials fallback
            email: 'aisha.patel@oxfordalumni.org',
            phone: '+44 7800 112233',
            job_title: 'Policy Advisor',
            company: 'Cabinet Office',
            city: 'London',
            time_zone: 'Europe/London',
            circle: 'close',
            how_we_met: 'University debate society teammate.',
            notes: 'Works on clean energy policy and green transition frameworks.',
            tags: ['university', 'policy', 'london'],
        },
        {
            id: 'p14',
            name: 'Ben Gallagher',
            photo_url: createAvatarSvg('BG', '#209dd7'),
            email: 'ben.gallagher@trailrun.co.uk',
            phone: '+44 7900 889900',
            job_title: 'Physiotherapist',
            company: 'Apex Performance Clinic',
            city: 'Edinburgh',
            time_zone: 'Europe/London',
            circle: 'close',
            check_ins_enabled: false, // Opted out of check-ins
            how_we_met: 'Met during the West Highland Way ultra marathon in 2021.',
            notes: 'Ultra runner. Said he prefers catching up organically when in Scotland.',
            tags: ['running', 'edinburgh', 'sports'],
        },
        // --- WIDER CIRCLE (Every 6 months / 180 days) ---
        {
            id: 'p15',
            name: 'Rachel Green-Sloan',
            photo_url: createAvatarSvg('RG', '#ecad0a'),
            email: 'rachel.sloan@sloanlegal.com',
            phone: '+1 (212) 555-0177',
            job_title: 'IP Attorney',
            company: 'Sloan & Partners LLP',
            city: 'New York',
            time_zone: 'America/New_York',
            circle: 'wider',
            how_we_met: 'Introduced by Marcus Vance for legal consultation.',
            notes: 'Helped incorporate our side project entity. Sharp copyright and patent lawyer.',
            tags: ['legal', 'new-york', 'ip'],
        },
        {
            id: 'p16',
            name: 'Jonas Lindqvist',
            photo_url: createAvatarSvg('JL', '#753991'),
            email: 'jonas@nordicventures.se',
            phone: '+46 8 123 4567',
            job_title: 'Partner',
            company: 'Creandum',
            city: 'Stockholm',
            time_zone: 'Europe/Stockholm',
            circle: 'wider',
            how_we_met: 'Met at Slush conference in Helsinki.',
            notes: 'Focuses on climate tech and SaaS. Loves archipelago sailing in summer.',
            tags: ['investor', 'stockholm', 'sailing'],
        },
        {
            id: 'p17',
            name: 'Priya Sharma',
            photo_url: null, // initials fallback
            email: 'priya.sharma@healthtech.in',
            phone: '+91 80 2345 6789',
            job_title: 'Co-Founder & CEO',
            company: 'Niramai Health',
            city: 'Bangalore',
            time_zone: 'Asia/Kolkata',
            circle: 'wider',
            how_we_met: 'Met on a panel at Y Combinator demo day alumni dinner.',
            notes: 'Building AI diagnostics for breast cancer screening in rural areas.',
            tags: ['founder', 'healthtech', 'bangalore', 'ycombinator'],
        },
        {
            id: 'p18',
            name: 'Felix Morel',
            photo_url: createAvatarSvg('FM', '#209dd7'),
            email: 'felix.morel@unige.ch',
            phone: '+41 22 379 7111',
            job_title: 'Professor of Economics',
            company: 'University of Geneva',
            city: 'Geneva',
            time_zone: 'Europe/Zurich',
            circle: 'wider',
            how_we_met: 'Former mentor during graduate thesis.',
            notes: 'Published extensively on macroeconomic monetary policies and carbon taxation.',
            tags: ['academic', 'mentor', 'geneva'],
        },
        {
            id: 'p19',
            name: 'Zoe Kravitz-Miller',
            photo_url: createAvatarSvg('ZK', '#ecad0a'),
            email: 'zoe@cinematography.tv',
            phone: '+1 (310) 555-0144',
            job_title: 'Director of Photography',
            company: 'Freelance / HBO',
            city: 'Los Angeles',
            time_zone: 'America/Los_Angeles',
            circle: 'wider',
            how_we_met: 'Met on set while shooting a tech documentary.',
            notes: 'Shoots with anamorphic lenses and Arri Alexa. Passionate about 35mm film stills.',
            tags: ['film', 'creative', 'los-angeles'],
        },
        {
            id: 'p20',
            name: 'Tariq Al-Fassi',
            photo_url: null, // initials fallback
            email: 'tariq.fassi@dubaiholding.ae',
            phone: '+971 4 362 7777',
            job_title: 'Infrastructure Strategist',
            company: 'Dubai Future Foundation',
            city: 'Dubai',
            time_zone: 'Asia/Dubai',
            circle: 'wider',
            how_we_met: 'Met at Gitex Tech Week in Dubai 2022.',
            notes: 'Leads smart city urban mobility pilots and autonomous drone transit initiatives.',
            tags: ['strategy', 'dubai', 'smart-city'],
        },
        {
            id: 'p21',
            name: 'Ananya Roy',
            photo_url: createAvatarSvg('AR', '#753991'),
            email: 'ananya.roy@ucl.ac.uk',
            phone: '+44 20 7679 2000',
            job_title: 'Associate Professor of Architecture',
            company: 'Bartlett UCL',
            city: 'London',
            time_zone: 'Europe/London',
            circle: 'wider',
            how_we_met: 'Attended her public lecture on sustainable urban density.',
            notes: 'Fascinating perspectives on timber architecture and biophilic urban design.',
            tags: ['architecture', 'academic', 'london'],
        },
        {
            id: 'p22',
            name: 'Matteo Rossi',
            photo_url: createAvatarSvg('MR', '#209dd7'),
            email: 'matteo.rossi@milanocoffee.it',
            phone: '+39 02 8739 1234',
            job_title: 'Master Roaster',
            company: 'Torrefazione Rossi',
            city: 'Milan',
            time_zone: 'Europe/Rome',
            circle: 'wider',
            how_we_met: 'Met in Navigli, Milan while visiting cafes in 2023.',
            notes: 'Imports directly from Ethiopian micro-lots. Sent incredible Geisha beans last Christmas.',
            tags: ['coffee', 'milan', 'culinary'],
        },
        // --- DISTANT CIRCLE (Yearly check-in / 365 days) ---
        {
            id: 'p23',
            name: 'Siddharth Patel',
            photo_url: createAvatarSvg('SP', '#ecad0a'),
            email: 'sid.patel@singaporetower.sg',
            phone: '+65 6789 0123',
            job_title: 'Chief Risk Officer',
            company: 'DBS Bank',
            city: 'Singapore',
            time_zone: 'Asia/Singapore',
            circle: 'distant',
            how_we_met: 'Met at a risk modeling seminar in London.',
            notes: 'Expert in algorithmic stress testing. Keeps in touch for annual market reviews.',
            tags: ['finance', 'singapore', 'banking'],
        },
        {
            id: 'p24',
            name: 'Astrid Lind',
            photo_url: null, // initials fallback
            email: 'astrid.lind@cph-design.dk',
            phone: '+45 33 12 34 56',
            job_title: 'Furniture Designer',
            company: 'Muuto Studio',
            city: 'Copenhagen',
            time_zone: 'Europe/Copenhagen',
            circle: 'distant',
            how_we_met: 'Met at 3daysofdesign festival in Copenhagen.',
            notes: 'Designs minimalist oak chairs and lighting fixtures.',
            tags: ['design', 'copenhagen', 'furniture'],
        },
        {
            id: 'p25',
            name: 'Kenji Sato',
            photo_url: createAvatarSvg('KS', '#753991'),
            email: 'kenji.sato@kyotocraft.jp',
            phone: '+81 75 746 0000',
            job_title: 'Ceramic Master & Potter',
            company: 'Sato Kiln Kyoto',
            city: 'Kyoto',
            time_zone: 'Asia/Tokyo',
            circle: 'distant',
            how_we_met: 'Visited his studio workshop in Higashiyama, Kyoto.',
            notes: 'Crafts wood-fired tea bowls with natural ash glaze. Once a year exchange.',
            tags: ['art', 'ceramics', 'kyoto'],
        },
        {
            id: 'p26',
            name: 'Olga Ivanova',
            photo_url: createAvatarSvg('OI', '#209dd7'),
            email: 'olga.ivanova@praguetheatre.cz',
            phone: '+420 224 901 111',
            job_title: 'Scenographer',
            company: 'National Theatre Prague',
            city: 'Prague',
            time_zone: 'Europe/Prague',
            circle: 'distant',
            how_we_met: 'Met through Elena Rostova at Prague Quadrennial.',
            notes: 'Spectacular stage designer for opera and classical ballet.',
            tags: ['theatre', 'arts', 'prague'],
        },
        {
            id: 'p27',
            name: 'Gabriel Silva',
            photo_url: null, // initials fallback
            email: 'gabriel.silva@saopaulotech.br',
            phone: '+55 11 3000 4000',
            job_title: 'VP Growth',
            company: 'Nubank',
            city: 'São Paulo',
            time_zone: 'America/Sao_Paulo',
            circle: 'distant',
            how_we_met: 'Met at Web Summit Rio.',
            notes: 'Scales fintech growth engines and credit modeling across Latin America.',
            tags: ['fintech', 'growth', 'sao-paulo'],
        },
        {
            id: 'p28',
            name: 'Ingrid Nygård',
            photo_url: createAvatarSvg('IN', '#ecad0a'),
            email: 'ingrid.nygard@oslomedia.no',
            phone: '+47 22 00 11 22',
            job_title: 'Investigative Journalist',
            company: 'NRK',
            city: 'Oslo',
            time_zone: 'Europe/Oslo',
            circle: 'distant',
            how_we_met: 'Met at International Journalism Festival in Perugia.',
            notes: 'Covers international maritime supply chains and Arctic climate policies.',
            tags: ['journalism', 'oslo', 'media'],
        },
        {
            id: 'p29',
            name: 'Arthur Pendelton',
            photo_url: createAvatarSvg('AP', '#753991'),
            email: 'arthur.pendelton@oxfordantiques.co.uk',
            phone: '+44 1865 240000',
            job_title: 'Rare Book Dealer',
            company: 'Blackwell Antiquarian Books',
            city: 'Oxford',
            time_zone: 'Europe/London',
            circle: 'distant',
            how_we_met: 'Bought first edition Orwell from him in 2016.',
            notes: 'Specialist in 19th-century scientific pamphlets and early printing.',
            tags: ['books', 'oxford', 'antiques'],
        },
        {
            id: 'p30',
            name: 'Mei-Ling Zhou',
            photo_url: null, // initials fallback
            email: 'meiling.zhou@hkbiotech.hk',
            phone: '+852 2859 2111',
            job_title: 'Chief Medical Officer',
            company: 'HK Biotech Alliance',
            city: 'Hong Kong',
            time_zone: 'Asia/Hong_Kong',
            circle: 'distant',
            how_we_met: 'Introduced by Maya Lin Chen.',
            notes: 'Runs clinical trials for oncology therapeutics across APAC.',
            tags: ['biotech', 'medicine', 'hong-kong'],
        },
        {
            id: 'p31',
            name: 'Lucas Dupont',
            photo_url: createAvatarSvg('LD', '#209dd7'),
            email: 'lucas.dupont@vignobles-bordeaux.fr',
            phone: '+33 5 56 00 00 00',
            job_title: 'Winemaker & Estate Manager',
            company: 'Château Margaux Valley',
            city: 'Bordeaux',
            time_zone: 'Europe/Paris',
            circle: 'distant',
            how_we_met: 'Met during harvest festival cycling tour in Gironde.',
            notes: 'Organic viticulture practitioner. Sends vintage allocation lists each autumn.',
            tags: ['wine', 'bordeaux', 'cycling'],
        },
        {
            id: 'p32',
            name: 'Fatima Zahra',
            photo_url: createAvatarSvg('FZ', '#ecad0a'),
            email: 'fatima.zahra@casablancadesign.ma',
            phone: '+212 522 000 111',
            job_title: 'Artisan Textile Director',
            company: 'Atlas Loom Works',
            city: 'Casablanca',
            time_zone: 'Africa/Casablanca',
            circle: 'distant',
            how_we_met: 'Met at Marrakech craft biennale.',
            notes: 'Supports Berber women weaving collectives across the High Atlas mountains.',
            tags: ['textiles', 'art', 'morocco'],
        },
        {
            id: 'p33',
            name: 'Soren Kirkegaard-Holst',
            photo_url: null, // initials fallback
            email: 'soren@aarhusarch.dk',
            phone: '+45 87 32 10 00',
            job_title: 'Landscape Architect',
            company: 'Schønherr Aarhus',
            city: 'Aarhus',
            time_zone: 'Europe/Copenhagen',
            circle: 'distant',
            how_we_met: 'Collaborated with Tom Jenkins on coastal park design.',
            notes: 'Pioneer in tidal wetlands restoration and sea-level rise mitigation.',
            tags: ['architecture', 'environment', 'denmark'],
        },
        {
            id: 'p34',
            name: 'Evelyn Reed',
            photo_url: createAvatarSvg('ER', '#753991'),
            email: 'evelyn.reed@austintech.io',
            phone: '+1 (512) 555-0199',
            job_title: 'VP of Hardware',
            company: 'RoboVibe',
            city: 'Austin',
            time_zone: 'America/Chicago',
            circle: 'inner',
            how_we_met: 'Co-speaker at SXSW Interactive 2023.',
            notes: 'Loves analog synthesizers, vinyl records, and smoked Texas brisket.',
            tags: ['hardware', 'austin', 'music', 'sxsw'],
        },
        {
            id: 'p35',
            name: 'Kofi Mensah',
            photo_url: createAvatarSvg('KM', '#209dd7'),
            email: 'kofi.mensah@accratech.gh',
            phone: '+233 24 123 4567',
            job_title: 'Founder & CEO',
            company: 'SolarGrid Africa',
            city: 'Accra',
            time_zone: 'Africa/Accra',
            circle: 'close',
            how_we_met: 'Introduced by David Okafor.',
            notes: 'Providing decentralized solar micro-grids to rural communities in West Africa.',
            tags: ['energy', 'founder', 'accra', 'climate'],
        },
    ];
    for (const person of peopleData) {
        repo.createPerson({
            ...person,
            check_ins_enabled: person.check_ins_enabled !== false,
        });
    }
    // --------------------------------------------------------------------------
    // INTERACTIONS (Going back over 1 year, various dates and types)
    // --------------------------------------------------------------------------
    const interactionsData = [
        // Elena Rostova (Overdue check-in: last spoke 45 days ago, cadence 30 days)
        {
            id: 'i1',
            person_id: 'p1',
            type: 'meetup',
            date: daysAgo(45),
            notes: 'Had flat white and almond croissants at Monmouth Coffee in Covent Garden. Elena shared early drafts of her new design system book.',
        },
        {
            id: 'i2',
            person_id: 'p1',
            type: 'call',
            date: daysAgo(85),
            notes: 'Catch-up call discussing her trip to Kyoto and the ceramic exhibition she visited.',
        },
        {
            id: 'i3',
            person_id: 'p1',
            type: 'meetup',
            date: daysAgo(180),
            notes: 'Dinner at Dishoom Kings Cross for her birthday celebration.',
        },
        {
            id: 'i4',
            person_id: 'p1',
            type: 'message',
            date: daysAgo(380),
            notes: 'Year-ago message checking in after her return from Scandinavian design tour.',
        },
        // Marcus Vance (Due soon: spoke 25 days ago, cadence 30 days)
        {
            id: 'i5',
            person_id: 'p2',
            type: 'call',
            date: daysAgo(25),
            notes: 'FaceTime call about his new role leading database infrastructure at Stripe. Discussed caching strategies.',
        },
        {
            id: 'i6',
            person_id: 'p2',
            type: 'meetup',
            date: daysAgo(110),
            notes: 'Grabbed tacos at La Taqueria in Mission District while in SF for conference.',
        },
        {
            id: 'i7',
            person_id: 'p2',
            type: 'email',
            date: daysAgo(400),
            notes: 'Sent him architectural diagrams on Raft consensus implementation.',
        },
        // Maya Lin Chen (In touch: spoke 5 days ago, cadence 30 days)
        {
            id: 'i8',
            person_id: 'p3',
            type: 'message',
            date: daysAgo(5),
            notes: 'Chatted on Signal about her upcoming marathon in Chicago and her new research grant approval.',
        },
        {
            id: 'i9',
            person_id: 'p3',
            type: 'call',
            date: daysAgo(40),
            notes: 'Monthly video call discussing her lab updates at Broad Institute.',
        },
        {
            id: 'i10',
            person_id: 'p3',
            type: 'meetup',
            date: daysAgo(360),
            notes: 'Met up in Cambridge, MA for Sunday brunch.',
        },
        // Samir Al-Mansoor (Overdue: spoke 55 days ago)
        {
            id: 'i11',
            person_id: 'p4',
            type: 'call',
            date: daysAgo(55),
            notes: 'Discord audio call testing his new binaural microphone setup and talking about synth modules.',
        },
        // Sarah Jenkins (Sister, cadence 14 days, spoke 3 days ago -> In touch)
        {
            id: 'i12',
            person_id: 'p5',
            type: 'call',
            date: daysAgo(3),
            notes: 'Weekly family catchup. Discussed mom and dad’s upcoming anniversary plans.',
        },
        {
            id: 'i13',
            person_id: 'p5',
            type: 'meetup',
            date: daysAgo(18),
            notes: 'Sunday roast at Sarah & Tom’s place in Oxford.',
        },
        // Chloe Dubois (Spoke 8 days ago -> In touch)
        {
            id: 'i14',
            person_id: 'p7',
            type: 'email',
            date: daysAgo(8),
            notes: 'Exchanged emails on new French translation of poetry anthology.',
        },
        // David Okafor (Close circle: 90 days cadence. Spoke 105 days ago -> Overdue)
        {
            id: 'i15',
            person_id: 'p8',
            type: 'call',
            date: daysAgo(105),
            notes: 'WhatsApp voice call discussing Nigerian startup ecosystem and new fintech regulation.',
        },
        {
            id: 'i16',
            person_id: 'p8',
            type: 'meetup',
            date: daysAgo(290),
            notes: 'Met at Africa Tech Summit dinner in London.',
        },
        // Hannah Weber (Spoke 84 days ago -> Due soon within 90 days)
        {
            id: 'i17',
            person_id: 'p9',
            type: 'message',
            date: daysAgo(84),
            notes: 'Telegram chat about her bike ride across the Bavarian Alps.',
        },
        // Liam O’Connor (Spoke 20 days ago -> In touch)
        {
            id: 'i18',
            person_id: 'p10',
            type: 'call',
            date: daysAgo(20),
            notes: 'Discussed product strategy and AI integration patterns for chat apps.',
        },
        // Carlos Mendoza (Overdue in close circle: 120 days ago)
        {
            id: 'i19',
            person_id: 'p12',
            type: 'message',
            date: daysAgo(120),
            notes: 'Exchanged Instagram messages on his new studio exhibition in Roma Norte.',
        },
        // Rachel Green-Sloan (Wider circle: 180 days cadence. Spoke 195 days ago -> Overdue)
        {
            id: 'i20',
            person_id: 'p15',
            type: 'email',
            date: daysAgo(195),
            notes: 'Email regarding trademark renewals and patent filing guidance.',
        },
        // Jonas Lindqvist (Spoke 175 days ago -> Due soon within 180 days)
        {
            id: 'i21',
            person_id: 'p16',
            type: 'call',
            date: daysAgo(175),
            notes: 'Quick check-in on European venture market climate and new fund raising.',
        },
        // Arthur Pendelton (Distant circle: 365 days cadence. Spoke 390 days ago -> Overdue)
        {
            id: 'i22',
            person_id: 'p29',
            type: 'meetup',
            date: daysAgo(390),
            notes: 'Visited his shop in Oxford. Looked through rare 19th-century typography specimen books.',
        },
        // Evelyn Reed (Spoke 12 days ago -> In touch)
        {
            id: 'i23',
            person_id: 'p34',
            type: 'meetup',
            date: daysAgo(12),
            notes: 'Coffee at Houndstooth in Austin. Tested out her new modular synth oscillator prototype.',
        },
    ];
    for (const inter of interactionsData) {
        repo.createInteraction(inter);
    }
    // --------------------------------------------------------------------------
    // IMPORTANT DATES (Birthdays falling in each of the next 3 months, leap year date, etc.)
    // --------------------------------------------------------------------------
    const nextMonth1 = (currentMonth % 12) + 1;
    const nextMonth2 = ((currentMonth + 1) % 12) + 1;
    const nextMonth3 = ((currentMonth + 2) % 12) + 1;
    const datesData = [
        // Birthday in current month (soon!)
        {
            id: 'd1',
            person_id: 'p1', // Elena Rostova
            type: 'birthday',
            title: 'Elena’s Birthday',
            month: currentMonth,
            day: Math.min(28, (today.getDate() + 5) % 28 || 15),
            year: 1994, // Age 32
        },
        // Milestone 40th Birthday in next month 1!
        {
            id: 'd2',
            person_id: 'p2', // Marcus Vance
            type: 'birthday',
            title: 'Marcus’s 40th Milestone Birthday',
            month: nextMonth1,
            day: 12,
            year: currentYear - 40, // Exact milestone birthday!
        },
        // Birthday in next month 2
        {
            id: 'd3',
            person_id: 'p3', // Maya Lin Chen
            type: 'birthday',
            title: 'Maya’s Birthday',
            month: nextMonth2,
            day: 18,
            year: 1992,
        },
        // Birthday in next month 3
        {
            id: 'd4',
            person_id: 'p4', // Samir Al-Mansoor
            type: 'birthday',
            title: 'Samir’s Birthday',
            month: nextMonth3,
            day: 22,
            year: 1988,
        },
        // Leap year February 29th birthday! (Special test case)
        {
            id: 'd5',
            person_id: 'p11', // Yuki Tanaka
            type: 'birthday',
            title: 'Yuki’s Leap Day Birthday',
            month: 2,
            day: 29,
            year: 1996,
        },
        // Wedding Anniversary with known year
        {
            id: 'd6',
            person_id: 'p5', // Sarah Jenkins
            type: 'anniversary',
            title: 'Wedding Anniversary (Sarah & Tom)',
            month: nextMonth1,
            day: 25,
            year: 2018,
        },
        // Work Anniversary with known year
        {
            id: 'd7',
            person_id: 'p8', // David Okafor
            type: 'work_anniversary',
            title: 'EchoVC Fund Founding Anniversary',
            month: nextMonth2,
            day: 8,
            year: 2015,
        },
        // Child's birthday without year (just recurring celebration)
        {
            id: 'd8',
            person_id: 'p5', // Sarah's child Leo
            type: 'child_birthday',
            title: "Leo's Birthday",
            month: nextMonth3,
            day: 4,
            year: 2022,
        },
        // Other milestone
        {
            id: 'd9',
            person_id: 'p18', // Felix Morel
            type: 'birthday',
            title: 'Felix’s 60th Milestone Birthday',
            month: nextMonth1,
            day: 19,
            year: currentYear - 60, // 60th milestone
        },
    ];
    for (const dateItem of datesData) {
        repo.createImportantDate(dateItem);
    }
    // --------------------------------------------------------------------------
    // FACTS (Small, durable, high-value personal details)
    // --------------------------------------------------------------------------
    const factsData = [
        { id: 'f1', person_id: 'p1', fact: 'Severe allergy to shellfish and hazelnuts.' },
        { id: 'f2', person_id: 'p1', fact: 'Loves Ethiopian single-origin filter coffee (especially Yirgacheffe).' },
        { id: 'f3', person_id: 'p1', fact: 'Favorite author is Ursula K. Le Guin.' },
        { id: 'f4', person_id: 'p2', fact: 'Partner is Sam (married in Big Sur in 2022).' },
        { id: 'f5', person_id: 'p2', fact: 'Climbed El Capitan (Nose route) in 2021.' },
        { id: 'f6', person_id: 'p2', fact: 'Supports Arsenal FC.' },
        { id: 'f7', person_id: 'p3', fact: 'Training for the Chicago Marathon; aiming for sub-3:15.' },
        { id: 'f8', person_id: 'p3', fact: 'Plays cello in a local community chamber orchestra.' },
        { id: 'f9', person_id: 'p4', fact: 'Collects rare Roland and Moog analog synthesizers.' },
        { id: 'f10', person_id: 'p4', fact: 'Has two rescue tabby cats named Osc and Filter.' },
        { id: 'f11', person_id: 'p5', fact: 'Favorite flowers are white peonies and sweet peas.' },
        { id: 'f12', person_id: 'p8', fact: 'FIDE Chess rating ~1950. Favorite opening is Sicilian Najdorf.' },
        { id: 'f13', person_id: 'p9', fact: 'Vegetarian since 2015.' },
        { id: 'f14', person_id: 'p22', fact: 'Roasts on a 1968 Probat cast-iron drum roaster in Milan.' },
    ];
    for (const f of factsData) {
        repo.createFact(f);
    }
    // --------------------------------------------------------------------------
    // NEWS (Dated, changeable life events)
    // --------------------------------------------------------------------------
    const newsData = [
        {
            id: 'n1',
            person_id: 'p1',
            content: 'Signed a book deal with O’Reilly for "Design Systems at Scale".',
            date: daysAgo(15),
        },
        {
            id: 'n2',
            person_id: 'p1',
            content: 'Promoted to Head of Product Design at DesignLab.',
            date: daysAgo(120),
        },
        {
            id: 'n3',
            person_id: 'p2',
            content: 'Joined Stripe as Staff Software Architect leading database reliability.',
            date: daysAgo(30),
        },
        {
            id: 'n4',
            person_id: 'p3',
            content: 'Awarded $1.5M NIH research grant for precision gene-editing therapy.',
            date: daysAgo(10),
        },
        {
            id: 'n5',
            person_id: 'p4',
            content: 'Scored soundtrack for an upcoming A24 indie sci-fi film.',
            date: daysAgo(40),
        },
        {
            id: 'n6',
            person_id: 'p5',
            content: 'Appointed Lead Pediatric Consultant at St. Thomas’ Neonatal Ward.',
            date: daysAgo(60),
        },
        {
            id: 'n7',
            person_id: 'p8',
            content: 'Announced closing of EchoVC Fund III at $65M.',
            date: daysAgo(25),
        },
        {
            id: 'n8',
            person_id: 'p9',
            content: 'Moved into a new passive house in Schwabing, Munich.',
            date: daysAgo(75),
        },
        {
            id: 'n9',
            person_id: 'p12',
            content: 'Solo exhibition opening at Museo Jumex in Mexico City this autumn.',
            date: daysAgo(18),
        },
        {
            id: 'n10',
            person_id: 'p34',
            content: 'Launched RoboVibe’s flagship motor controller board to rave reviews.',
            date: daysAgo(14),
        },
    ];
    for (const n of newsData) {
        repo.createNews(n);
    }
    // --------------------------------------------------------------------------
    // REMINDERS (Due, overdue, and completed)
    // --------------------------------------------------------------------------
    const remindersData = [
        // Overdue reminder
        {
            id: 'r1',
            person_id: 'p1',
            title: 'Send Elena feedback on chapters 3 & 4 of her book draft',
            due_date: daysAgo(2),
            completed: false,
        },
        // Due today / tomorrow
        {
            id: 'r2',
            person_id: 'p2',
            title: 'Wish Marcus good luck on his Stripe architecture keynote',
            due_date: daysAhead(1),
            completed: false,
        },
        // Due next week
        {
            id: 'r3',
            person_id: 'p3',
            title: 'Check in with Maya before her Chicago qualifying marathon',
            due_date: daysAhead(7),
            completed: false,
        },
        // Due in 2 weeks
        {
            id: 'r4',
            person_id: 'p8',
            title: 'Introduce David to the renewable energy founders in London',
            due_date: daysAhead(14),
            completed: false,
        },
        // Completed reminder
        {
            id: 'r5',
            person_id: 'p5',
            title: 'Order birthday flowers for Sarah’s clinic opening',
            due_date: daysAgo(10),
            completed: true,
            completed_at: daysAgo(9) + 'T14:30:00.000Z',
        },
        // Completed reminder
        {
            id: 'r6',
            person_id: 'p9',
            title: 'Share EuroVelo cycling route GPS tracks with Hannah',
            due_date: daysAgo(20),
            completed: true,
            completed_at: daysAgo(19) + 'T10:00:00.000Z',
        },
    ];
    for (const r of remindersData) {
        repo.createReminder(r);
    }
    // --------------------------------------------------------------------------
    // GIFTS (Ideas, given, received; linked with upcoming dates)
    // --------------------------------------------------------------------------
    const giftsData = [
        // Outstanding gift idea for Elena whose birthday is approaching within 30 days!
        {
            id: 'g1',
            person_id: 'p1',
            name: 'First edition of Ursula K. Le Guin’s "The Left Hand of Darkness"',
            status: 'idea',
            occasion: 'Birthday',
            date: null,
            notes: 'Check with Arthur Pendelton at Blackwell’s Oxford to source a copy.',
        },
        // Outstanding gift idea for Marcus (Milestone 40th birthday coming up!)
        {
            id: 'g2',
            person_id: 'p2',
            name: 'Custom engraved Petzl GriGri belay device and Yosemite guide',
            status: 'idea',
            occasion: '40th Milestone Birthday',
            date: null,
            notes: 'Engrave with "Vance - Big Wall 2026"',
        },
        // Gift given in past
        {
            id: 'g3',
            person_id: 'p1',
            name: 'Handcrafted ceramic pour-over dripper from Kyoto',
            status: 'given',
            occasion: 'Christmas 2025',
            date: daysAgo(230),
            notes: 'She loved the speckled blue glaze.',
        },
        // Gift received in past
        {
            id: 'g4',
            person_id: 'p2',
            name: 'Artisanal barrel-aged stout from Russian River Brewing',
            status: 'received',
            occasion: 'Last Visit to SF',
            date: daysAgo(110),
            notes: 'Delicious Pliny the Elder and special cellar reserve.',
        },
        // Gift given to sister Sarah
        {
            id: 'g5',
            person_id: 'p5',
            name: 'Framed botanical illustration print of David Austin English roses',
            status: 'given',
            occasion: 'Wedding Anniversary',
            date: daysAgo(365),
            notes: 'Hung in their garden conservatory.',
        },
        // Gift idea for Maya
        {
            id: 'g6',
            person_id: 'p3',
            name: 'Garmin Forerunner GPS running watch strap & recovery electrolyte set',
            status: 'idea',
            occasion: 'Post-Marathon Celebration',
            date: null,
            notes: 'Check her preferred colorway (slate gray or teal).',
        },
    ];
    for (const g of giftsData) {
        repo.createGift(g);
    }
    // --------------------------------------------------------------------------
    // CONNECTIONS (Bidirectional relationships with inverse roles)
    // --------------------------------------------------------------------------
    const connectionsData = [
        // Sarah Jenkins (p5) is Sister to Tom Jenkins (p6 is spouse/partner)
        {
            id: 'c1',
            person_a_id: 'p5',
            person_b_id: 'p6',
            relationship_type: 'partner',
        },
        // Marcus Vance (p2) introduced Rachel Green-Sloan (p15)
        {
            id: 'c2',
            person_a_id: 'p2',
            person_b_id: 'p15',
            relationship_type: 'introduced',
        },
        // Elena Rostova (p1) is Colleague/Friend to Olga Ivanova (p26)
        {
            id: 'c3',
            person_a_id: 'p1',
            person_b_id: 'p26',
            relationship_type: 'colleague',
        },
        // David Okafor (p8) introduced Kofi Mensah (p35)
        {
            id: 'c4',
            person_a_id: 'p8',
            person_b_id: 'p35',
            relationship_type: 'introduced',
        },
        // Maya Lin Chen (p3) introduced Mei-Ling Zhou (p30)
        {
            id: 'c5',
            person_a_id: 'p3',
            person_b_id: 'p30',
            relationship_type: 'introduced',
        },
        // Tom Jenkins (p6) is Colleague of Soren Kirkegaard-Holst (p33)
        {
            id: 'c6',
            person_a_id: 'p6',
            person_b_id: 'p33',
            relationship_type: 'colleague',
        },
    ];
    for (const c of connectionsData) {
        repo.createConnection(c);
    }
    console.log(`Successfully seeded database with 35 people, interactions, dates, facts, news, reminders, gifts, and connections.`);
}
