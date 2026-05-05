import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

// =====================================================
// CONTENU PÉDAGOGIQUE — Conseils par semaine de grossesse
// =====================================================
const adviceContent = {
  // T1 : 1-13 SA
  t1: {
    nutrition: [
      { icon: '🥬', title: 'Acide folique', text: 'Mangez du moringa frais (gnigne), des feuilles de manioc, et des légumes verts. Essentiels pour le développement du système nerveux du bébé.' },
      { icon: '🐟', title: 'Poisson local frais', text: 'Préférez le yaboy, le tiof ou la sole grillés. Évitez le poisson cru (sushi) et fumé en grande quantité.' },
      { icon: '🥤', title: 'Hydratation', text: 'Buvez 2 litres d\'eau par jour. Les jus de bissap ou bouye non sucrés sont excellents.' },
      { icon: '🚫', title: 'À éviter', text: 'Café fort, kinkéliba en excès, viande peu cuite, fromages au lait cru, alcool (bissap fermenté).' }
    ],
    physical: [
      { icon: '🚶🏾‍♀️', title: 'Marche douce', text: 'Marchez 20-30 minutes par jour, tôt le matin (avant 9h) ou en fin de journée pour éviter la chaleur.' },
      { icon: '😴', title: 'Repos', text: 'Dormez 8-9 heures par nuit. Évitez de dormir sur le dos après 16 SA — préférez le côté gauche.' },
      { icon: '🌡️', title: 'Chaleur & climat', text: 'Restez à l\'ombre entre 12h et 16h. Portez du coton léger, évitez le synthétique. Hydratez-vous régulièrement.' }
    ],
    warnings: 'Au T1, les nausées matinales sont normales. Mangez par petites quantités. Consultez votre sage-femme si vomissements fréquents.'
  },
  // T2 : 14-27 SA
  t2: {
    nutrition: [
      { icon: '🥜', title: 'Niébé et lentilles', text: 'Riches en fer et protéines. Le mafé bien mijoté ou le ndambé sont excellents (avec modération de l\'huile).' },
      { icon: '🥛', title: 'Calcium', text: 'Lait caillé (sow), yaourt local, sardines en conserve avec arêtes. Important pour les os du bébé.' },
      { icon: '🍠', title: 'Patate douce & manioc', text: 'Excellents glucides. Préférez bouillis ou en bouillie plutôt que frits.' },
      { icon: '🍊', title: 'Vitamine C', text: 'Mangues, oranges, papayes, jujubes. Aide à absorber le fer.' },
      { icon: '⚠️', title: 'Modération', text: 'Limitez le sel (risque hypertension), le sucre raffiné (diabète gestationnel), la friture.' }
    ],
    physical: [
      { icon: '🧘🏾‍♀️', title: 'Étirements doux', text: 'Étirements du dos pour les douleurs lombaires. Évitez les abdominaux classiques.' },
      { icon: '👟', title: 'Marche modérée', text: '30-45 minutes par jour. Bonnes chaussures (évitez les talons). Lieu ombragé.' },
      { icon: '🏊🏾‍♀️', title: 'Natation', text: 'Excellent pour soulager le poids. Si vous avez accès à une piscine, 2-3 fois/semaine.' },
      { icon: '🛏️', title: 'Position de sommeil', text: 'Dormez sur le côté gauche avec un coussin entre les jambes. Améliore la circulation vers le bébé.' }
    ],
    warnings: 'Surveillez votre tension. En cas de céphalées sévères, troubles visuels ou œdèmes importants, consultez immédiatement.'
  },
  // T3 : 28+ SA
  t3: {
    nutrition: [
      { icon: '🍚', title: 'Énergie progressive', text: 'Préférez le riz complet, le mil, le couscous de fonio. 5-6 petits repas par jour plutôt que 3 gros.' },
      { icon: '🐟', title: 'Oméga 3', text: 'Poissons gras (yaboy, sardines), graines de sésame, huile d\'arachide. Essentiels pour le cerveau du bébé.' },
      { icon: '🥗', title: 'Fibres', text: 'Légumes (jaxatu, gombo, salade), fruits avec peau. Évite la constipation fréquente en T3.' },
      { icon: '💧', title: 'Hydratation +++', text: 'Augmentez à 2,5-3 litres par jour. Surtout en saison chaude. Évitez les boissons sucrées industrielles.' },
      { icon: '🚫', title: 'Pic de précaution', text: 'Évitez les plats lourds le soir. Fractionnez les repas. Pas d\'alcool, pas de tabac, pas d\'automédication.' }
    ],
    physical: [
      { icon: '🚶🏾‍♀️', title: 'Marche quotidienne', text: 'Continuez 20-30 min/jour. Aide à la descente du bébé et prépare l\'accouchement.' },
      { icon: '🪑', title: 'Position assise', text: 'Évitez de rester assise plus d\'1h. Surélevez vos jambes pour réduire les œdèmes.' },
      { icon: '🤸🏾‍♀️', title: 'Exercices du périnée', text: 'Pratiquez les exercices de Kegel : 10 contractions, 3 fois par jour. Prépare l\'accouchement.' },
      { icon: '😴', title: 'Sommeil', text: 'Coussins multiples : entre les jambes, sous le ventre, derrière le dos. Côté gauche impératif.' },
      { icon: '🧠', title: 'Préparez-vous', text: 'Préparez votre sac de maternité dès 35 SA. Vérifiez votre dossier de réservation à la maternité.' }
    ],
    warnings: 'Dès 37 SA, l\'accouchement peut survenir à tout moment. Connaissez les signes du travail : contractions régulières, perte des eaux, perte du bouchon muqueux.'
  }
}

// =====================================================
// TRANSLATIONS
// =====================================================
const t = {
  fr: {
    welcome: "Bienvenue", login: "Se connecter", signup: "Créer un compte",
    email: "Email", password: "Mot de passe", phone: "Téléphone",
    firstName: "Prénom", lastName: "Nom", validate: "Valider",
    noAccount: "Pas encore de compte ?", hasAccount: "Déjà un compte ?",
    setupProfile: "Complétez votre profil",
    week: "Semaine", weekShort: "S", days: "jours",
    nextAppointment: "Prochain rendez-vous", noAppointment: "Aucun RDV planifié",
    riskLow: "Grossesse normale", riskHigh: "⚠ Risque élevé",
    home: "Accueil", carnet: "Carnet", advice: "Conseils", sos: "SOS", more: "Plus",
    myFollowUp: "Mon suivi", trimester1: "T1", trimester2: "T2", trimester3: "T3",
    medicalRecord: "Mon carnet médical", noConsultations: "Aucune consultation",
    weight: "Poids", bp: "TA", uh: "HU", bcf: "BCF",
    logout: "Se déconnecter", pregnancyComplete: "Aucune grossesse en cours",
    helloName: "Bonjour", howAreYou: "comment vous sentez-vous ?",
    daysToBaby: "jusqu'à votre bébé",
    consultationFrom: "CPN du", performedBy: "par",
    waitingForFirstCPN: "Votre première CPN n'a pas encore été saisie.",
    sosTitle: "Bouton d'urgence",
    sosSubtitle: "En cas d'urgence, votre sage-femme et vos proches seront alertés",
    sosButton: "Appuyer pour alerte",
    sosLocating: "Localisation en cours...",
    sosSending: "Envoi de l'alerte...",
    sosSent: "Alerte envoyée",
    sosSentDesc: "Votre position a été partagée. Aide en route.",
    sosCancel: "Annuler l'alerte",
    sosError: "Erreur d'envoi",
    sosNoLocation: "Activez la géolocalisation",
    sosNotifiedTitle: "Personnes alertées",
    sosYourLocation: "Votre position",
    sosWhenToUse: "Quand utiliser le SOS",
    sosUseCase1: "Saignements importants",
    sosUseCase2: "Maux de tête sévères avec troubles visuels",
    sosUseCase3: "Douleurs abdominales intenses",
    sosUseCase4: "Diminution des mouvements du bébé",
    sosUseCase5: "Convulsions ou perte de connaissance",
    activeAlert: "Alerte en cours",
    loadingContacts: "Chargement des contacts...",
    consents: "Consentements",
    pendingRequests: "Demandes en attente",
    noPendingRequests: "Aucune demande en attente",
    pendingBadge: "demande en attente",
    pendingBadgePlural: "demandes en attente",
    accept: "Accepter", refuse: "Refuser",
    acceptedConsents: "Accès accordés",
    confirmAccept: "Accepter cette demande ?",
    confirmAcceptDesc: "donnera l'accès complet à votre dossier médical",
    confirmRefuse: "Refuser cette demande ?",
    requestedAt: "Demandé le",
    privacyNote: "Vous pouvez à tout moment retirer un accès.",
    noAccessGranted: "Aucun professionnel n'a accès à votre dossier",
    // Conseils
    adviceTitle: "Conseils & Bien-être",
    adviceSubtitle: "Adaptés à votre grossesse et au Sénégal",
    thisWeek: "Cette semaine",
    nutritionTab: "🍽️ Nutrition",
    physicalTab: "🚶🏾‍♀️ Activité physique",
    warningsTab: "⚠️ À surveiller",
    trimesterTitle: "Trimestre",
    weekTitle: "Vous êtes à",
    // Congé maternité
    maternityLeave: "Congé maternité",
    leaveStart: "Départ recommandé",
    leaveEnd: "Retour prévu",
    leaveDuration: "14 semaines (Sénégal)",
    leaveBeforeBirth: "6 semaines avant",
    leaveAfterBirth: "8 semaines après",
    leaveLegal: "Code du Travail Art. L.143",
    daysUntilLeave: "jours avant votre congé",
    onLeave: "Vous êtes en congé maternité",
    daysUntilReturn: "jours avant votre retour",
    leaveInfo: "Info légale",
  },
  wo: {
    welcome: "Dalal ak diam", login: "Dugg", signup: "Sos kont",
    email: "Email", password: "Password", phone: "Telefon",
    firstName: "Tur", lastName: "Sant", validate: "Wonal",
    noAccount: "Amul kont ?", hasAccount: "Am nga kont ?",
    setupProfile: "Mottali sa profil",
    week: "Ayubés", weekShort: "S", days: "fan",
    nextAppointment: "RDV bi ñëw", noAppointment: "Amul RDV",
    riskLow: "Biir bu baax", riskHigh: "⚠ Mussiba ci kaw",
    home: "Kër", carnet: "Karne", advice: "Ndigël", sos: "Mussiba", more: "Yeneen",
    myFollowUp: "Sama wuyool", trimester1: "T1", trimester2: "T2", trimester3: "T3",
    medicalRecord: "Sama karne fajj", noConsultations: "Amul consultation",
    weight: "Diis", bp: "Tension", uh: "HU", bcf: "BCF",
    logout: "Génn", pregnancyComplete: "Amul biir",
    helloName: "Asalaa Maleekum", howAreYou: "naka nga def ?",
    daysToBaby: "ngir sa doom",
    consultationFrom: "CPN bu", performedBy: "ko",
    waitingForFirstCPN: "Sa CPN bu njekk défuko.",
    sosTitle: "Buton mussiba",
    sosSubtitle: "Su am mussiba, sa sage-femme dañu yeg",
    sosButton: "Bësal ngir alert",
    sosLocating: "Mu ngi gisé fan nga nekk...",
    sosSending: "Mu ngi yónnëe alert bi...",
    sosSent: "Alert bi yónnëe na",
    sosSentDesc: "Sa fan dañu ko yegle. Ndimbal ngi ñëw.",
    sosCancel: "Bayyi alert bi",
    sosError: "Erreur ci yónnëe",
    sosNoLocation: "Joxal autorisation",
    sosNotifiedTitle: "Nit ñi nu yegle",
    sosYourLocation: "Sa fan",
    sosWhenToUse: "Ban saa nga war jëfandikoo SOS",
    sosUseCase1: "Deret bu bare",
    sosUseCase2: "Métit boppu bu metti",
    sosUseCase3: "Métit ci biir",
    sosUseCase4: "Sa doom du yengu lu bare",
    sosUseCase5: "Convulsions",
    activeAlert: "Alert ngi dox",
    loadingContacts: "Yittewu nañu sa contacts...",
    consents: "Joxe ndigël",
    pendingRequests: "Ñakkaay ñu xaar",
    noPendingRequests: "Amul ñakkaay",
    pendingBadge: "ñakkaay bu xaar",
    pendingBadgePlural: "ñakkaay yu xaar",
    accept: "Nangu", refuse: "Bañ",
    acceptedConsents: "Joxe nañu ndigël",
    confirmAccept: "Nangu ñakkaay bi ?",
    confirmAcceptDesc: "dina am bés ci sa karne",
    confirmRefuse: "Bañ ñakkaay bi ?",
    requestedAt: "Ñakkaay bi",
    privacyNote: "Mën nga jële bés bi.",
    noAccessGranted: "Amul ku am bés",
    adviceTitle: "Ndigël & jamm",
    adviceSubtitle: "Bu jaaxal sa biir ak Senegaal",
    thisWeek: "Ayubés bii",
    nutritionTab: "🍽️ Lekk",
    physicalTab: "🚶🏾‍♀️ Yëf",
    warningsTab: "⚠️ Sàmm",
    trimesterTitle: "Trimestre",
    weekTitle: "Ngi ci",
    maternityLeave: "Cong jur",
    leaveStart: "Tambali",
    leaveEnd: "Dellu",
    leaveDuration: "14 ayubés (Senegaal)",
    leaveBeforeBirth: "6 ayubés bal",
    leaveAfterBirth: "8 ayubés gannaaw",
    leaveLegal: "Code du Travail",
    daysUntilLeave: "fan bal cong",
    onLeave: "Ngi ci cong jur",
    daysUntilReturn: "fan bal dellu",
    leaveInfo: "Xibaar",
  }
}

// =====================================================
// MAIN APP
// =====================================================
export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState('fr')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session) loadProfile(session.user.id)
        else { setProfile(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    if (data?.preferred_language) setLang(data.preferred_language)
    setLoading(false)
  }

  return (
    <div style={appBgStyle}>
      <PhoneFrame>
        {loading ? <LoadingScreen/> :
         !session ? <AuthScreen tr={t[lang]} lang={lang} setLang={setLang}/> :
         !profile ? <ProfileSetupScreen tr={t[lang]} userId={session.user.id} email={session.user.email} onComplete={() => loadProfile(session.user.id)}/> :
         profile.role !== 'femme' ? <WrongRoleScreen profile={profile}/> :
         <MobileApp profile={profile} session={session} tr={t[lang]} lang={lang} setLang={setLang}/>}
      </PhoneFrame>
    </div>
  )
}

// =====================================================
// PHONE FRAME, LOADING, AUTH (inchangés)
// =====================================================
function PhoneFrame({ children }) {
  return (
    <div style={{
      width: '100%', maxWidth: 400, height: 844, maxHeight: 'calc(100vh - 48px)',
      background: '#FAF6F0', borderRadius: 44, overflow: 'hidden',
      boxShadow: '0 60px 100px -20px rgba(0,0,0,0.6), 0 0 0 12px #1a0e08, 0 0 0 14px #2a1810',
      display: 'flex', flexDirection: 'column', position: 'relative'
    }}>
      <div style={{ height: 44, background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', fontSize: 14, fontWeight: 600, color: '#2a1810', flexShrink: 0, position: 'relative' }}>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>9:41</span>
        <div style={{ position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)', width: 90, height: 28, background: '#1a0e08', borderRadius: 20 }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11 }}>📶</span>
          <div style={{ width: 24, height: 12, border: '1.5px solid #2a1810', borderRadius: 3, padding: 1 }}>
            <div style={{ width: '70%', height: '100%', background: '#2a1810', borderRadius: 1 }}/>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FAF6F0', fontSize: 32, marginBottom: 16 }}>♥</div>
      <div style={{ fontSize: 32, fontFamily: 'Georgia, serif', fontWeight: 600 }}>Yaay</div>
    </div>
  )
}

function AuthScreen({ tr, lang, setLang }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (mode === 'signup') { const { error } = await supabase.auth.signUp({ email, password }); if (error) throw error }
      else { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error }
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 50%, #2D5F5D 100%)', color: '#FAF6F0', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        {['fr', 'wo'].map(l => (
          <button key={l} onClick={() => setLang(l)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, background: lang === l ? '#FAF6F0' : 'rgba(255,255,255,0.2)', color: lang === l ? '#2a1810' : '#FAF6F0', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{l.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 600 }}>
        <div style={{ width: 70, height: 70, borderRadius: 22, background: 'rgba(244,228,193,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, fontSize: 36, color: '#C44536' }}>♥</div>
        <div style={{ fontSize: 40, fontFamily: 'Georgia, serif', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em' }}>Yaay</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 8, fontStyle: 'italic' }}>{tr.welcome}</div>
        <div style={{ marginTop: 32, background: '#FAF6F0', color: '#2a1810', borderRadius: 24, padding: 24 }}>
          <h2 style={{ fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 600, marginBottom: 16 }}>{mode === 'signup' ? tr.signup : tr.login}</h2>
          <form onSubmit={handleSubmit}>
            <div><label style={mLabelStyle}>{tr.email}</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={mInputStyle}/></div>
            <div style={{ marginTop: 14 }}><label style={mLabelStyle}>{tr.password}</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={mInputStyle}/></div>
            {error && <div style={mErrorStyle}>⚠️ {error}</div>}
            <button type="submit" disabled={loading} style={{ ...mPrimaryButtonStyle, marginTop: 20, opacity: loading ? 0.6 : 1 }}>{loading ? '...' : (mode === 'signup' ? tr.signup : tr.login)}</button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#5D4037' }}>
            {mode === 'signup' ? tr.hasAccount : tr.noAccount}{' '}
            <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null) }} style={mLinkStyle}>{mode === 'signup' ? tr.login : tr.signup}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileSetupScreen({ tr, userId, email, onComplete }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.from('profiles').insert({
      id: userId, email, first_name: firstName, last_name: lastName,
      role: 'femme', phone: '+221' + phone, date_of_birth: dob || null, preferred_language: 'fr'
    })
    if (error) { setError(error.message); setLoading(false) }
    else onComplete()
  }

  return (
    <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
      <div style={{ width: 50, height: 50, borderRadius: 16, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FAF6F0', fontSize: 24, marginBottom: 20 }}>♥</div>
      <h1 style={{ fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 600, lineHeight: 1.2 }}>{tr.setupProfile}</h1>
      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
        <div><label style={mLabelStyle}>{tr.firstName}</label><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={mInputStyle}/></div>
        <div style={{ marginTop: 14 }}><label style={mLabelStyle}>{tr.lastName}</label><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={mInputStyle}/></div>
        <div style={{ marginTop: 14 }}>
          <label style={mLabelStyle}>{tr.phone}</label>
          <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', borderRadius: 12, border: '2px solid rgba(42,24,16,0.08)', overflow: 'hidden' }}>
            <span style={{ padding: '12px 14px', fontWeight: 600, borderRight: '1px solid rgba(42,24,16,0.1)' }}>🇸🇳 +221</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="77 123 45 67" required style={{ ...mInputStyle, border: 'none' }}/>
          </div>
        </div>
        <div style={{ marginTop: 14 }}><label style={mLabelStyle}>Date de naissance</label><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={mInputStyle}/></div>
        {error && <div style={mErrorStyle}>⚠️ {error}</div>}
        <button type="submit" disabled={loading} style={{ ...mPrimaryButtonStyle, marginTop: 24, opacity: loading ? 0.6 : 1 }}>{loading ? '...' : tr.validate}</button>
      </form>
    </div>
  )
}

function WrongRoleScreen({ profile }) {
  async function handleLogout() { await supabase.auth.signOut() }
  return (
    <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 60, marginBottom: 16 }}>🔒</div>
      <h2 style={{ fontSize: 22, fontFamily: 'Georgia, serif', marginBottom: 12 }}>Accès réservé aux patientes</h2>
      <button onClick={handleLogout} style={mPrimaryButtonStyle}>Se déconnecter</button>
    </div>
  )
}

// =====================================================
// MOBILE APP - 5 onglets désormais
// =====================================================
function MobileApp({ profile, session, tr, lang, setLang }) {
  const [tab, setTab] = useState('home')
  const [pregnancy, setPregnancy] = useState(null)
  const [consultations, setConsultations] = useState([])
  const [appointments, setAppointments] = useState([])
  const [activeAlert, setActiveAlert] = useState(null)
  const [emergencyContacts, setEmergencyContacts] = useState([])
  const [midwives, setMidwives] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!profile?.id) return
    const channel = supabase
      .channel('app-changes-' + profile.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pregnancies', filter: `woman_id=eq.${profile.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `woman_id=eq.${profile.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consent_requests', filter: `woman_id=eq.${profile.id}` }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  async function loadData() {
    const { data: preg } = await supabase.from('pregnancies').select('*').eq('woman_id', profile.id).eq('status', 'en_cours').maybeSingle()
    setPregnancy(preg)

    if (preg) {
      const { data: cpns } = await supabase.from('consultations').select('*').eq('pregnancy_id', preg.id).order('consultation_date', { ascending: false })
      setConsultations(cpns || [])

      const { data: apps } = await supabase.from('appointments').select('*').eq('pregnancy_id', preg.id).gte('appointment_date', new Date().toISOString()).order('appointment_date', { ascending: true })
      setAppointments(apps || [])
    }

    const { data: contacts } = await supabase.from('emergency_contacts').select('*').eq('woman_id', profile.id).eq('notify_for_sos', true)
    setEmergencyContacts(contacts || [])

    const { data: consents } = await supabase.from('consents').select('granted_to').eq('woman_id', profile.id).eq('status', 'accorde').eq('scope', 'lecture_dossier')
    if (consents && consents.length > 0) {
      const proIds = [...new Set(consents.map(c => c.granted_to))]
      const { data: pros } = await supabase.from('profiles').select('id, first_name, last_name, phone').in('id', proIds)
      setMidwives(pros || [])
    } else {
      setMidwives([])
    }

    const { data: alert } = await supabase.from('alerts').select('*').eq('woman_id', profile.id).eq('type', 'sos').eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle()
    setActiveAlert(alert)

    const { data: requests } = await supabase.from('consent_requests').select('*').eq('woman_id', profile.id).eq('status', 'en_attente').order('created_at', { ascending: false })
    if (requests && requests.length > 0) {
      const requesterIds = [...new Set(requests.map(r => r.requested_by))]
      const { data: requesters } = await supabase.from('profiles').select('id, first_name, last_name, role, phone, structure_id').in('id', requesterIds)
      const structureIds = [...new Set((requesters || []).map(r => r.structure_id).filter(Boolean))]
      const { data: structures } = structureIds.length > 0
        ? await supabase.from('structures').select('id, name, region').in('id', structureIds)
        : { data: [] }
      const requestsWithRequesters = requests.map(r => {
        const requester = requesters?.find(req => req.id === r.requested_by)
        const structure = structures?.find(s => s.id === requester?.structure_id)
        return { ...r, requester: { ...requester, structure } }
      })
      setPendingRequests(requestsWithRequesters)
    } else {
      setPendingRequests([])
    }

    setLoading(false)
  }

  if (loading) return <LoadingScreen/>

  return (
    <>
      <TopBar profile={profile} lang={lang} setLang={setLang}/>
      {activeAlert && tab !== 'sos' && (
        <button onClick={() => setTab('sos')} style={{ padding: '10px 16px', background: '#C44536', color: '#FAF6F0', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, animation: 'pulse 2s infinite' }}>
          <span>🚨 {tr.activeAlert}</span><span>→</span>
        </button>
      )}
      {pendingRequests.length > 0 && tab !== 'more' && (
        <button onClick={() => setTab('more')} style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #D4A574 0%, #8B6F5C 100%)', color: '#FAF6F0', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
          <span>📨 {pendingRequests.length} {pendingRequests.length === 1 ? tr.pendingBadge : tr.pendingBadgePlural}</span><span>→</span>
        </button>
      )}
      <div style={{ flex: 1, overflowY: 'auto', background: '#FAF6F0' }}>
        {tab === 'home' && <HomeView profile={profile} pregnancy={pregnancy} appointments={appointments} tr={tr}/>}
        {tab === 'carnet' && <CarnetView pregnancy={pregnancy} consultations={consultations} tr={tr}/>}
        {tab === 'advice' && <AdviceView pregnancy={pregnancy} tr={tr}/>}
        {tab === 'sos' && <SOSView profile={profile} activeAlert={activeAlert} emergencyContacts={emergencyContacts} midwives={midwives} tr={tr} onAlertChange={loadData}/>}
        {tab === 'more' && <MoreView profile={profile} pendingRequests={pendingRequests} midwives={midwives} tr={tr} onChange={loadData}/>}
      </div>
      <BottomNav tab={tab} setTab={setTab} tr={tr} hasAlert={!!activeAlert} pendingCount={pendingRequests.length}/>
    </>
  )
}

function TopBar({ profile, lang, setLang }) {
  return (
    <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(42,24,16,0.06)', background: '#FAF6F0', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FAF6F0', fontSize: 18 }}>♥</div>
        <div>
          <div style={{ fontSize: 20, fontFamily: 'Georgia, serif', fontWeight: 700, color: '#2a1810', lineHeight: 1 }}>Yaay</div>
          <div style={{ fontSize: 10, color: '#8B6F5C', marginTop: 2, fontWeight: 500 }}>{profile.first_name}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {['fr', 'wo'].map(l => (
          <button key={l} onClick={() => setLang(l)} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 700, background: lang === l ? '#2a1810' : 'rgba(42,24,16,0.06)', color: lang === l ? '#FAF6F0' : '#2a1810', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>{l.toUpperCase()}</button>
        ))}
      </div>
    </div>
  )
}

// =====================================================
// CALCUL CONGÉ MATERNITÉ (législation Sénégal)
// =====================================================
function calculateMaternityLeave(expectedDeliveryDate) {
  if (!expectedDeliveryDate) return null
  const dda = new Date(expectedDeliveryDate)
  const today = new Date()

  // Code Travail Sénégal Art. L.143 :
  // 14 semaines total, 6 sem avant accouchement + 8 sem après
  const leaveStart = new Date(dda)
  leaveStart.setDate(leaveStart.getDate() - 42) // 6 semaines avant DDA

  const leaveEnd = new Date(dda)
  leaveEnd.setDate(leaveEnd.getDate() + 56) // 8 semaines après DDA

  const daysUntilLeave = Math.ceil((leaveStart - today) / (1000 * 60 * 60 * 24))
  const daysUntilReturn = Math.ceil((leaveEnd - today) / (1000 * 60 * 60 * 24))
  const isOnLeave = today >= leaveStart && today <= leaveEnd

  return { leaveStart, leaveEnd, daysUntilLeave, daysUntilReturn, isOnLeave }
}

// =====================================================
// HOME VIEW (avec congé maternité)
// =====================================================
function HomeView({ profile, pregnancy, appointments, tr }) {
  if (!pregnancy) {
    return (
      <div style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70%' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🤰</div>
        <h2 style={{ fontSize: 22, fontFamily: 'Georgia, serif', marginBottom: 12 }}>{tr.pregnancyComplete}</h2>
        <p style={{ fontSize: 13, color: '#5D4037', lineHeight: 1.5 }}>Demandez à votre sage-femme de créer votre dossier de grossesse.</p>
      </div>
    )
  }

  const weeks = Math.floor((new Date() - new Date(pregnancy.last_period_date)) / (1000 * 60 * 60 * 24 * 7))
  const daysToTerm = Math.floor((new Date(pregnancy.expected_delivery_date) - new Date()) / (1000 * 60 * 60 * 24))
  const progress = Math.min(100, (weeks / 40) * 100)
  const nextApp = appointments[0]
  const isHighRisk = pregnancy.current_risk_level === 'eleve' || pregnancy.current_risk_level === 'tres_eleve'
  const leave = calculateMaternityLeave(pregnancy.expected_delivery_date)

  return (
    <div style={{ padding: '20px 18px 100px' }}>
      <div>
        <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{tr.helloName}</div>
        <div style={{ fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 600, color: '#2a1810', marginTop: 4, lineHeight: 1.1 }}>
          {profile.first_name},<br/>
          <span style={{ color: '#C44536', fontStyle: 'italic' }}>{tr.howAreYou}</span>
        </div>
      </div>

      <div style={{ marginTop: 20, background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', borderRadius: 28, padding: '24px 22px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,228,193,0.15) 0%, transparent 70%)' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(244,228,193,0.7)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{tr.weekShort}{weeks} · {tr.myFollowUp}</div>
            <div style={{ fontSize: 46, fontFamily: 'Georgia, serif', fontWeight: 600, color: '#FAF6F0', marginTop: 4, lineHeight: 1 }}>
              {daysToTerm > 0 ? daysToTerm : 0}
              <span style={{ fontSize: 16, fontWeight: 400, color: 'rgba(244,228,193,0.6)', marginLeft: 6 }}>{tr.days}</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(244,228,193,0.85)', marginTop: 4 }}>{tr.daysToBaby}</div>
          </div>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(244,228,193,0.12)', border: '2px solid rgba(244,228,193,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>👶</div>
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ height: 6, background: 'rgba(244,228,193,0.15)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #F4E4C1 0%, #D4A574 100%)', borderRadius: 3 }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'rgba(244,228,193,0.6)', fontWeight: 500 }}>
            <span>S0</span>
            <span style={{ color: '#F4E4C1', fontWeight: 700 }}>{weeks <= 13 ? tr.trimester1 : weeks <= 27 ? `${tr.trimester2} ✓` : `${tr.trimester3} ✓`}</span>
            <span>S40</span>
          </div>
        </div>
        <div style={{ marginTop: 18, background: isHighRisk ? 'rgba(196,69,54,0.2)' : 'rgba(244,228,193,0.12)', border: `1px solid ${isHighRisk ? 'rgba(196,69,54,0.4)' : 'rgba(244,228,193,0.2)'}`, borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: isHighRisk ? '#FF6B6B' : '#7FB069' }}/>
          <div style={{ flex: 1, fontSize: 12, color: '#FAF6F0', fontWeight: 600 }}>{isHighRisk ? tr.riskHigh : tr.riskLow}</div>
        </div>
      </div>

      {nextApp && (
        <div style={{ marginTop: 14, background: '#FFFFFF', borderRadius: 20, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(42,24,16,0.04)' }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #F4E4C1 0%, #E8D5A8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#8B6F5C' }}>{new Date(nextApp.appointment_date).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}</div>
            <div style={{ fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 700, color: '#2a1810', lineHeight: 1 }}>{new Date(nextApp.appointment_date).getDate()}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 600, textTransform: 'uppercase' }}>{tr.nextAppointment}</div>
            <div style={{ fontSize: 15, color: '#2a1810', fontWeight: 600, marginTop: 2 }}>{nextApp.type === 'cpn' ? 'Consultation prénatale' : nextApp.type}</div>
          </div>
        </div>
      )}

      {/* CONGÉ MATERNITÉ */}
      {leave && (
        <div style={{
          marginTop: 14,
          background: leave.isOnLeave
            ? 'linear-gradient(135deg, #DDEBE9 0%, #B6D5D2 100%)'
            : '#FFFFFF',
          borderRadius: 20,
          padding: 18,
          border: leave.isOnLeave ? 'none' : '1px solid rgba(42,24,16,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: leave.isOnLeave ? '#1F4341' : 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)',
              color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20
            }}>📅</div>
            <div>
              <div style={{ fontSize: 11, color: '#1F4341', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {tr.maternityLeave}
              </div>
              <div style={{ fontSize: 10, color: '#5D4037', fontStyle: 'italic' }}>{tr.leaveDuration}</div>
            </div>
          </div>

          {leave.isOnLeave ? (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1F4341' }}>✓ {tr.onLeave}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: '#5D4037' }}>
                {leave.daysUntilReturn > 0
                  ? <>Encore <strong>{leave.daysUntilReturn} {tr.days}</strong> {tr.daysUntilReturn}</>
                  : <>Votre congé prend fin aujourd'hui</>
                }
              </div>
            </div>
          ) : leave.daysUntilLeave > 0 ? (
            <div>
              <div style={{ fontSize: 14, color: '#5D4037' }}>
                <strong style={{ color: '#1F4341', fontSize: 22, fontFamily: 'Georgia, serif' }}>{leave.daysUntilLeave}</strong>
                {' '}{tr.daysUntilLeave}
              </div>
              <div style={{ marginTop: 10, padding: 10, background: '#F5F1EB', borderRadius: 10, fontSize: 11, color: '#5D4037', lineHeight: 1.5 }}>
                <div>📌 <strong>{tr.leaveStart}</strong> : {leave.leaveStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div style={{ marginTop: 4 }}>📌 <strong>{tr.leaveEnd}</strong> : {leave.leaveEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div style={{ marginTop: 8, fontStyle: 'italic', color: '#8B6F5C', fontSize: 10 }}>
                  📖 {tr.leaveLegal} : {tr.leaveBeforeBirth} + {tr.leaveAfterBirth}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#5D4037', fontStyle: 'italic' }}>
              Période de congé maternité passée. Reprise du travail recommandée.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =====================================================
// CARNET VIEW
// =====================================================
function CarnetView({ pregnancy, consultations, tr }) {
  if (!pregnancy) return <div style={{ padding: 24, textAlign: 'center' }}>{tr.pregnancyComplete}</div>

  return (
    <div style={{ padding: '20px 18px 100px' }}>
      <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{tr.medicalRecord}</div>
      <div style={{ fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 600, color: '#2a1810', marginTop: 2 }}>Mon carnet</div>

      {consultations.length === 0 ? (
        <div style={{ marginTop: 24, padding: 24, background: '#FFFFFF', borderRadius: 16, textAlign: 'center', border: '1px solid rgba(42,24,16,0.04)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👩🏾‍⚕️</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{tr.noConsultations}</div>
          <div style={{ fontSize: 12, color: '#5D4037', lineHeight: 1.5, marginTop: 8 }}>{tr.waitingForFirstCPN}</div>
        </div>
      ) : (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {consultations.map(c => (
            <div key={c.id} style={{ background: '#FFFFFF', borderRadius: 16, padding: 16, border: '1px solid rgba(42,24,16,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{tr.consultationFrom} {new Date(c.consultation_date).toLocaleDateString('fr-FR')}</div>
                  <div style={{ fontSize: 10, color: '#8B6F5C', marginTop: 2 }}>{tr.weekShort}{c.gestational_age_weeks || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <MiniVital label={tr.weight} value={c.weight_kg || '—'} unit="kg"/>
                <MiniVital label={tr.bp} value={c.blood_pressure_systolic && c.blood_pressure_diastolic ? `${c.blood_pressure_systolic}/${c.blood_pressure_diastolic}` : '—'} unit=""/>
                <MiniVital label={tr.uh} value={c.uterine_height_cm || '—'} unit="cm"/>
                <MiniVital label={tr.bcf} value={c.fetal_heart_rate || '—'} unit="bpm"/>
              </div>
              {c.observations && <div style={{ marginTop: 12, padding: 10, background: '#F5F1EB', borderRadius: 10, fontSize: 11, color: '#5D4037', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{c.observations}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniVital({ label, value, unit }) {
  return (
    <div style={{ background: '#F5F1EB', borderRadius: 10, padding: 8, textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#8B6F5C', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, justifyContent: 'center', marginTop: 2 }}>
        <span style={{ fontSize: 14, fontFamily: 'Georgia, serif', fontWeight: 700 }}>{value}</span>
        {unit && <span style={{ fontSize: 9, color: '#8B6F5C' }}>{unit}</span>}
      </div>
    </div>
  )
}

// =====================================================
// ADVICE VIEW (NOUVEAU - Conseils nutrition + santé)
// =====================================================
function AdviceView({ pregnancy, tr }) {
  const [section, setSection] = useState('nutrition')

  if (!pregnancy) {
    return (
      <div style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70%' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🌿</div>
        <h2 style={{ fontSize: 18, fontFamily: 'Georgia, serif', marginBottom: 12 }}>Conseils disponibles</h2>
        <p style={{ fontSize: 13, color: '#5D4037', lineHeight: 1.5 }}>Une fois votre grossesse enregistrée, vous recevrez des conseils adaptés à chaque trimestre.</p>
      </div>
    )
  }

  const weeks = Math.floor((new Date() - new Date(pregnancy.last_period_date)) / (1000 * 60 * 60 * 24 * 7))
  const trimester = weeks <= 13 ? 't1' : weeks <= 27 ? 't2' : 't3'
  const trimesterLabel = trimester === 't1' ? tr.trimester1 : trimester === 't2' ? tr.trimester2 : tr.trimester3
  const content = adviceContent[trimester]

  return (
    <div style={{ padding: '20px 18px 100px' }}>
      <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{tr.adviceTitle}</div>
      <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 600, color: '#2a1810', marginTop: 2 }}>
        {tr.weekTitle} <span style={{ color: '#C44536', fontStyle: 'italic' }}>S{weeks}</span>
      </div>
      <div style={{ fontSize: 12, color: '#5D4037', marginTop: 4 }}>{tr.adviceSubtitle}</div>

      {/* Bandeau trimestre */}
      <div style={{
        marginTop: 16, padding: 16,
        background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)',
        color: '#FAF6F0', borderRadius: 18,
        display: 'flex', alignItems: 'center', gap: 14
      }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(244,228,193,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          {trimester === 't1' ? '🌱' : trimester === 't2' ? '🌸' : '🌻'}
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{tr.trimesterTitle}</div>
          <div style={{ fontSize: 18, fontFamily: 'Georgia, serif', fontWeight: 700 }}>{trimesterLabel}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginTop: 16, display: 'flex', gap: 4, background: '#F5F1EB', borderRadius: 12, padding: 3 }}>
        <button onClick={() => setSection('nutrition')} style={{
          flex: 1, padding: '10px 8px', borderRadius: 9,
          background: section === 'nutrition' ? '#FFFFFF' : 'transparent',
          color: section === 'nutrition' ? '#2a1810' : '#5D4037',
          fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: section === 'nutrition' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
        }}>{tr.nutritionTab}</button>
        <button onClick={() => setSection('physical')} style={{
          flex: 1, padding: '10px 8px', borderRadius: 9,
          background: section === 'physical' ? '#FFFFFF' : 'transparent',
          color: section === 'physical' ? '#2a1810' : '#5D4037',
          fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: section === 'physical' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
        }}>{tr.physicalTab}</button>
      </div>

      {/* Contenu */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(section === 'nutrition' ? content.nutrition : content.physical).map((item, i) => (
          <div key={i} style={{
            background: '#FFFFFF', borderRadius: 16, padding: 14,
            border: '1px solid rgba(42,24,16,0.04)',
            display: 'flex', gap: 12, alignItems: 'flex-start'
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#F4E4C1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0
            }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#2a1810' }}>{item.title}</div>
              <div style={{ fontSize: 12, color: '#5D4037', marginTop: 4, lineHeight: 1.5 }}>{item.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Avertissement trimestre */}
      <div style={{
        marginTop: 16, padding: 14,
        background: 'linear-gradient(135deg, #FFE8E2 0%, #F4E4C1 100%)',
        borderRadius: 14,
        border: '1px solid rgba(196,69,54,0.2)'
      }}>
        <div style={{ fontSize: 11, color: '#8B2E26', fontWeight: 700, marginBottom: 4 }}>⚠️ À surveiller à ce stade</div>
        <div style={{ fontSize: 12, color: '#5D4037', lineHeight: 1.5 }}>{content.warnings}</div>
      </div>

      {/* Note de bas de page */}
      <div style={{ marginTop: 16, padding: 12, background: '#F5F1EB', borderRadius: 12, fontSize: 11, color: '#8B6F5C', fontStyle: 'italic', lineHeight: 1.5, textAlign: 'center' }}>
        💡 Ces conseils sont génériques. Suivez toujours les recommandations spécifiques de votre sage-femme.
      </div>
    </div>
  )
}

// =====================================================
// SOS VIEW (inchangé)
// =====================================================
function SOSView({ profile, activeAlert, emergencyContacts, midwives, tr, onAlertChange }) {
  const [step, setStep] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (activeAlert) setStep('active')
    else if (step === 'active') setStep('idle')
  }, [activeAlert])

  async function triggerSOS() {
    setStep('locating')
    setError(null)

    if (!navigator.geolocation) {
      setError(tr.sosNoLocation); setStep('error'); return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setStep('sending')
        try {
          const { error: insertError } = await supabase.from('alerts').insert({
            woman_id: profile.id, type: 'sos', status: 'active',
            latitude, longitude, gps_accuracy: accuracy,
            message: 'Alerte SOS déclenchée depuis l\'application',
            husband_notified: emergencyContacts.length > 0,
            midwife_notified: midwives.length > 0,
            ambulance_notified: false,
          })
          if (insertError) throw insertError
          setTimeout(() => onAlertChange(), 500)
        } catch (err) { setError(err.message); setStep('error') }
      },
      (geoError) => { setError(`Géolocalisation refusée : ${geoError.message}`); setStep('error') },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  async function cancelAlert() {
    if (!activeAlert) return
    if (!confirm(`${tr.sosCancel} ?`)) return
    await supabase.from('alerts').update({ status: 'resolue', resolved_at: new Date().toISOString(), resolution_notes: 'Annulée par la patiente' }).eq('id', activeAlert.id)
    setStep('idle')
    onAlertChange()
  }

  if (step === 'active' && activeAlert) {
    return (
      <div style={{ flex: 1, background: 'linear-gradient(180deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(244,228,193,0.2)', flexShrink: 0, background: 'rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>🚨 {tr.activeAlert}</div>
          <button onClick={cancelAlert} style={{ padding: '8px 14px', background: '#FAF6F0', color: '#8B2E26', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✕ {tr.sosCancel}</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(244,228,193,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '3px solid #FAF6F0', fontSize: 36 }}>✓</div>
            <div style={{ fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 600, marginTop: 16 }}>{tr.sosSent}</div>
            <div style={{ fontSize: 12, color: 'rgba(244,228,193,0.85)', marginTop: 6 }}>{tr.sosSentDesc}</div>
          </div>
          <div style={{ background: 'rgba(244,228,193,0.95)', color: '#2a1810', borderRadius: 16, padding: 14, marginTop: 16 }}>
            <div style={{ fontSize: 10, color: '#8B6F5C', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>📍 {tr.sosYourLocation}</div>
            <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>{activeAlert.latitude?.toFixed(6)}, {activeAlert.longitude?.toFixed(6)}</div>
            <a href={`https://www.google.com/maps?q=${activeAlert.latitude},${activeAlert.longitude}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 8, padding: '8px 12px', background: '#2D5F5D', color: '#FAF6F0', borderRadius: 8, fontSize: 11, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>Voir sur Google Maps →</a>
          </div>
          <button onClick={cancelAlert} style={{ marginTop: 16, marginBottom: 10, width: '100%', padding: 14, background: 'rgba(244,228,193,0.15)', color: '#FAF6F0', borderRadius: 12, border: '2px solid rgba(244,228,193,0.5)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✕ {tr.sosCancel}</button>
        </div>
      </div>
    )
  }

  if (step === 'locating' || step === 'sending') {
    return (
      <div style={{ flex: 1, padding: 24, background: 'linear-gradient(180deg, #FAF6F0 0%, #FFE8E2 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, animation: 'pulse 1s infinite' }}>{step === 'locating' ? '📍' : '📡'}</div>
        <div style={{ marginTop: 24, fontSize: 18, fontFamily: 'Georgia, serif', fontWeight: 600 }}>{step === 'locating' ? tr.sosLocating : tr.sosSending}</div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div style={{ flex: 1, padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 22, fontFamily: 'Georgia, serif', marginBottom: 12, color: '#8B2E26' }}>{tr.sosError}</h2>
        <p style={{ fontSize: 13, color: '#5D4037', marginBottom: 24 }}>{error}</p>
        <button onClick={() => setStep('idle')} style={mPrimaryButtonStyle}>Réessayer</button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, padding: 20, background: 'linear-gradient(180deg, #FAF6F0 0%, #FFE8E2 100%)', overflowY: 'auto' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 600 }}>{tr.sosTitle}</h2>
        <p style={{ fontSize: 12, color: '#5D4037', marginTop: 6, lineHeight: 1.4, maxWidth: 280, margin: '6px auto 0' }}>{tr.sosSubtitle}</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
        <button onClick={triggerSOS} style={{ width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #E85D4D 0%, #C44536 50%, #8B2E26 100%)', color: '#FAF6F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 50px rgba(196,69,54,0.5)', border: '6px solid #FAF6F0', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ fontSize: 44 }}>⚠️</div>
          <div style={{ fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 700, marginTop: 4 }}>SOS</div>
        </button>
      </div>
      <p style={{ marginTop: 18, fontSize: 13, color: '#8B2E26', fontWeight: 600, textAlign: 'center' }}>{tr.sosButton}</p>
      <div style={{ marginTop: 24, background: '#FFFFFF', borderRadius: 14, padding: 14, border: '1px solid rgba(42,24,16,0.06)' }}>
        <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>⚠️ {tr.sosWhenToUse}</div>
        {[tr.sosUseCase1, tr.sosUseCase2, tr.sosUseCase3, tr.sosUseCase4, tr.sosUseCase5].map((useCase, i) => (
          <div key={i} style={{ fontSize: 12, padding: '5px 0', display: 'flex', gap: 8 }}>
            <span style={{ color: '#C44536', fontWeight: 700 }}>•</span>{useCase}
          </div>
        ))}
      </div>
    </div>
  )
}

// =====================================================
// MORE VIEW (consentements)
// =====================================================
function MoreView({ profile, pendingRequests, midwives, tr, onChange }) {
  async function handleLogout() { await supabase.auth.signOut() }
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState(null)

  async function acceptRequest(request) {
    if (!confirm(`${tr.confirmAccept}\n\n${request.requester?.first_name} ${request.requester?.last_name} ${tr.confirmAcceptDesc}`)) return
    setActionLoading(request.id)
    setError(null)
    try {
      const { error: updateError } = await supabase.from('consent_requests').update({ status: 'accorde', responded_at: new Date().toISOString() }).eq('id', request.id)
      if (updateError) throw updateError

      const { error: consentError } = await supabase.from('consents').insert([
        { woman_id: profile.id, granted_to: request.requested_by, scope: request.scope || 'lecture_dossier', status: 'accorde', granted_at: new Date().toISOString() },
        { woman_id: profile.id, granted_to: request.requested_by, scope: 'ecriture_dossier', status: 'accorde', granted_at: new Date().toISOString() }
      ])
      if (consentError) throw consentError
      onChange()
    } catch (err) { setError(err.message) } finally { setActionLoading(null) }
  }

  async function refuseRequest(request) {
    if (!confirm(`${tr.confirmRefuse}`)) return
    setActionLoading(request.id)
    try {
      await supabase.from('consent_requests').update({ status: 'refuse', responded_at: new Date().toISOString() }).eq('id', request.id)
      onChange()
    } finally { setActionLoading(null) }
  }

  return (
    <div style={{ padding: '20px 18px 100px' }}>
      <div style={{ fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 600, color: '#2a1810' }}>Mon compte</div>

      <div style={{ marginTop: 20, padding: 16, background: '#FFFFFF', borderRadius: 16, border: '1px solid rgba(42,24,16,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>{profile.first_name?.[0]}{profile.last_name?.[0]}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{profile.first_name} {profile.last_name}</div>
            <div style={{ fontSize: 12, color: '#8B6F5C', marginTop: 2, fontFamily: 'monospace' }}>{profile.ipu}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 18, fontFamily: 'Georgia, serif', fontWeight: 600, color: '#2a1810', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>🔐 {tr.consents}</div>

        {error && <div style={{ marginBottom: 12, padding: 10, background: '#FFE8E2', borderRadius: 10, fontSize: 11, color: '#8B2E26' }}>⚠️ {error}</div>}

        {pendingRequests.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>📨 {tr.pendingRequests} ({pendingRequests.length})</div>
            {pendingRequests.map(req => (
              <div key={req.id} style={{ background: 'linear-gradient(135deg, #FFF6E8 0%, #FFEAB8 100%)', border: '2px solid #D4A574', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🩺</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#2a1810' }}>{req.requester?.first_name} {req.requester?.last_name}</div>
                    <div style={{ fontSize: 11, color: '#5D4037', marginTop: 2 }}>{req.requester?.role === 'sage_femme' ? 'Sage-femme' : 'Médecin'}{req.requester?.structure?.name && ` · ${req.requester.structure.name}`}</div>
                    {req.message && <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.6)', borderRadius: 8, fontSize: 11, color: '#5D4037', lineHeight: 1.4, fontStyle: 'italic' }}>« {req.message} »</div>}
                    <div style={{ fontSize: 10, color: '#8B6F5C', marginTop: 6 }}>{tr.requestedAt} {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => refuseRequest(req)} disabled={actionLoading === req.id} style={{ flex: 1, padding: 10, background: '#FFFFFF', color: '#8B2E26', border: '2px solid #C44536', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading === req.id ? 0.5 : 1 }}>✕ {tr.refuse}</button>
                  <button onClick={() => acceptRequest(req)} disabled={actionLoading === req.id} style={{ flex: 2, padding: 10, background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', color: '#FAF6F0', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading === req.id ? 0.5 : 1 }}>{actionLoading === req.id ? '...' : `✓ ${tr.accept}`}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>✓ {tr.acceptedConsents} ({midwives.length})</div>
          {midwives.length === 0 ? (
            <div style={{ padding: 14, background: '#F5F1EB', borderRadius: 12, fontSize: 12, color: '#8B6F5C', textAlign: 'center', fontStyle: 'italic' }}>{tr.noAccessGranted}</div>
          ) : midwives.map((m, i) => (
            <div key={i} style={{ background: '#FFFFFF', border: '1px solid rgba(42,24,16,0.06)', borderRadius: 12, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🩺</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{m.first_name} {m.last_name}</div>
                <div style={{ fontSize: 10, color: '#8B6F5C' }}>{m.phone || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleLogout} style={{ marginTop: 24, width: '100%', padding: 14, background: '#F5F1EB', color: '#8B2E26', borderRadius: 14, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{tr.logout}</button>
    </div>
  )
}

// =====================================================
// BOTTOM NAVIGATION (5 onglets désormais)
// =====================================================
function BottomNav({ tab, setTab, tr, hasAlert, pendingCount }) {
  const items = [
    { id: 'home', icon: '🏠', label: tr.home },
    { id: 'carnet', icon: '📋', label: tr.carnet },
    { id: 'sos', icon: '⚠️', label: tr.sos, primary: true },
    { id: 'advice', icon: '🌿', label: tr.advice },
    { id: 'more', icon: '☰', label: tr.more, badge: pendingCount > 0 ? pendingCount : null },
  ]
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(250,246,240,0.95)', borderTop: '1px solid rgba(42,24,16,0.08)', padding: '10px 12px 20px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 10 }}>
      {items.map(item => {
        const active = tab === item.id
        if (item.primary) {
          return (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              width: 54, height: 54, borderRadius: '50%',
              background: hasAlert ? 'linear-gradient(135deg, #FF6B6B 0%, #C44536 100%)' :
                          active ? 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)' :
                          'linear-gradient(135deg, #E85D4D 0%, #C44536 100%)',
              color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, marginTop: -20, border: '4px solid #FAF6F0', cursor: 'pointer',
              animation: hasAlert ? 'pulse 1.2s infinite' : 'none'
            }}>{item.icon}</button>
          )
        }
        return (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            flex: 1, padding: '6px 4px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, color: active ? '#C44536' : '#8B6F5C',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', position: 'relative'
          }}>
            <div style={{ position: 'relative' }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.badge && (
                <div style={{ position: 'absolute', top: -4, right: -8, minWidth: 16, height: 16, padding: '0 4px', background: '#C44536', color: '#FAF6F0', borderRadius: 8, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FAF6F0', boxSizing: 'content-box' }}>{item.badge}</div>
              )}
            </div>
            <span style={{ fontSize: 9, fontWeight: active ? 700 : 500 }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// =====================================================
// STYLES
// =====================================================
const appBgStyle = { minHeight: '100vh', background: 'radial-gradient(ellipse at top, #2a1810 0%, #1a0e08 60%, #0f0805 100%)', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }
const mLabelStyle = { fontSize: 11, color: '#8B6F5C', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }
const mInputStyle = { width: '100%', padding: '11px 14px', fontSize: 14, fontWeight: 500, color: '#2a1810', background: '#FFFFFF', border: '2px solid rgba(42,24,16,0.08)', borderRadius: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
const mPrimaryButtonStyle = { width: '100%', padding: 13, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', borderRadius: 14, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 6px 16px rgba(196,69,54,0.3)', fontFamily: 'inherit' }
const mLinkStyle = { color: '#C44536', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, fontFamily: 'inherit' }
const mErrorStyle = { marginTop: 12, padding: 10, background: '#FFE8E2', borderRadius: 10, fontSize: 11, color: '#8B2E26', fontWeight: 500 }

if (typeof document !== 'undefined' && !document.getElementById('yaay-animations')) {
  const style = document.createElement('style')
  style.id = 'yaay-animations'
  style.textContent = `@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.95; } }`
  document.head.appendChild(style)
}