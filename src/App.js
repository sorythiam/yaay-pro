import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

// =====================================================
// MAIN APP - Routeur de vues
// =====================================================
export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState({ name: 'home', data: null })

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
        else { setProfile(null); setLoading(false); setView({ name: 'home', data: null }) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*, structure:structures(name, region, district)')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  // ============================================================
  // GARDE-FRONTIÈRE : vérifier consentement avant d'ouvrir dossier
  // ============================================================
  async function openPatientDossier(patientId) {
    if (!profile) return
    // Vérifier s'il y a un consentement actif
    const { data: consent } = await supabase
      .from('consents')
      .select('id, status')
      .eq('woman_id', patientId)
      .eq('granted_to', profile.id)
      .eq('scope', 'lecture_dossier')
      .eq('status', 'accorde')
      .maybeSingle()

    if (consent) {
      // ✅ Accès autorisé → ouvre le dossier
      setView({ name: 'patient', data: patientId })
    } else {
      // ❌ Pas de consentement → redirige vers la demande
      setView({ name: 'requestConsent', data: patientId })
    }
  }

  if (loading) return <LoadingScreen />
  if (!session) return <AuthScreen />
  if (!profile) return <ProfileSetupScreen userId={session.user.id} email={session.user.email} onComplete={() => loadProfile(session.user.id)} />

  switch (view.name) {
    case 'patient':
      return <PatientFileView profile={profile} patientId={view.data} setView={setView} openPatientDossier={openPatientDossier} />
    case 'newCPN':
      return <NewCPNView profile={profile} pregnancyId={view.data.pregnancyId} patientId={view.data.patientId} setView={setView} />
    case 'newPregnancy':
      return <NewPregnancyView profile={profile} patientId={view.data} setView={setView} />
    case 'alert':
      return <AlertDetailView profile={profile} alertId={view.data} setView={setView} openPatientDossier={openPatientDossier} />
    case 'enrollPatient':
      return <EnrollPatientView profile={profile} setView={setView} openPatientDossier={openPatientDossier} />
    case 'requestConsent':
      return <RequestConsentScreen profile={profile} patientId={view.data} setView={setView} />
    default:
      return <DashboardHome profile={profile} setView={setView} openPatientDossier={openPatientDossier} />
  }
}

// =====================================================
// LOADING & AUTH (inchangés)
// =====================================================
function LoadingScreen() {
  return (
    <div style={loadingStyle}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FAF6F0', fontSize: 32, marginBottom: 16 }}>♥</div>
      <div style={{ fontSize: 32, fontFamily: 'Georgia, serif', fontWeight: 600 }}>Yaay</div>
    </div>
  )
}

function AuthScreen() {
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
    <div style={authBgStyle}>
      <div style={authCardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={logoSmallStyle}>♥</div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Yaay</div>
            <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 600, letterSpacing: '0.05em' }}>ESPACE PROFESSIONNEL</div>
          </div>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, fontFamily: 'Georgia, serif', marginTop: 32, lineHeight: 1.2 }}>
          {mode === 'signup' ? "Créer un compte" : "Se connecter"}<br/>
          <span style={{ fontStyle: 'italic', color: '#C44536' }}>{mode === 'signup' ? "professionnel" : "à Yaay Pro"}</span>
        </h1>
        <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
          <div><label style={labelStyle}>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle}/></div>
          <div style={{ marginTop: 16 }}><label style={labelStyle}>Mot de passe</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={inputStyle}/></div>
          {error && <div style={errorBoxStyle}>⚠️ {error}</div>}
          <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, marginTop: 24, opacity: loading ? 0.6 : 1 }}>
            {loading ? '...' : (mode === 'signup' ? 'Créer mon compte' : 'Se connecter')}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#5D4037' }}>
          {mode === 'signup' ? "Déjà un compte ? " : "Pas encore de compte ? "}
          <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null) }} style={linkButtonStyle}>
            {mode === 'signup' ? 'Se connecter' : "Créer un compte"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProfileSetupScreen({ userId, email, onComplete }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('sage_femme')
  const [phone, setPhone] = useState('')
  const [structureId, setStructureId] = useState('')
  const [structures, setStructures] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('structures').select('id, name, region').then(({ data }) => { if (data) setStructures(data) })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.from('profiles').insert({
      id: userId, email, first_name: firstName, last_name: lastName,
      role, phone: '+221' + phone, structure_id: structureId || null, preferred_language: 'fr'
    })
    if (error) { setError(error.message); setLoading(false) }
    else onComplete()
  }

  return (
    <div style={authBgStyle}>
      <div style={{ ...authCardStyle, maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={logoSmallStyle}>♥</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Bienvenue dans Yaay Pro</h1>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Prénom</label><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle}/></div>
            <div><label style={labelStyle}>Nom</label><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle}/></div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Rôle</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
              <option value="sage_femme">Sage-femme</option>
              <option value="medecin">Médecin</option>
            </select>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Téléphone</label>
            <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', borderRadius: 12, border: '2px solid rgba(42,24,16,0.08)', overflow: 'hidden' }}>
              <span style={{ padding: '12px 14px', fontWeight: 600, borderRight: '1px solid rgba(42,24,16,0.1)' }}>🇸🇳 +221</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="77 654 32 10" required style={{ ...inputStyle, border: 'none' }}/>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Structure de santé</label>
            <select value={structureId} onChange={(e) => setStructureId(e.target.value)} style={inputStyle}>
              <option value="">— Sélectionnez —</option>
              {structures.map(s => <option key={s.id} value={s.id}>{s.name} ({s.region})</option>)}
            </select>
          </div>
          {error && <div style={errorBoxStyle}>⚠️ {error}</div>}
          <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, marginTop: 24, opacity: loading ? 0.6 : 1 }}>
            {loading ? '...' : 'Valider mon profil'}
          </button>
        </form>
      </div>
    </div>
  )
}

// =====================================================
// REQUEST CONSENT SCREEN (NOUVEAU - le garde-frontière)
// =====================================================
function RequestConsentScreen({ profile, patientId, setView }) {
  const [patient, setPatient] = useState(null)
  const [existingRequest, setExistingRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => { loadData() }, [patientId])

  async function loadData() {
    setLoading(true)
    const { data: p } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, ipu, phone, date_of_birth, city, region')
      .eq('id', patientId).single()
    setPatient(p)

    // Vérifier s'il y a déjà une demande en attente
    const { data: req } = await supabase
      .from('consent_requests')
      .select('*')
      .eq('woman_id', patientId)
      .eq('requested_by', profile.id)
      .in('status', ['en_attente', 'refuse'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setExistingRequest(req)

    setLoading(false)
  }

  async function sendRequest() {
    setSending(true)
    setError(null)
    try {
      const { error: reqError } = await supabase.from('consent_requests').insert({
        woman_id: patientId,
        requested_by: profile.id,
        scope: 'lecture_dossier',
        message: `${profile.first_name} ${profile.last_name} (${profile.role === 'sage_femme' ? 'sage-femme' : 'médecin'}) à ${profile.structure?.name || 'la structure'} demande l'accès à votre dossier médical.`
      })
      if (reqError) throw reqError
      setSuccess(true)
      setSending(false)
    } catch (err) {
      setError(err.message)
      setSending(false)
    }
  }

  if (loading) return <LoadingScreen/>
  if (!patient) return <div>Patiente introuvable.</div>

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView({ name: 'home' })} style={backButtonStyle}>← Retour</button>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Demander un consentement</div>
          <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2 }}>Conformité RGPD - CDP Sénégal</div>
        </div>
      </header>

      <main style={{ padding: '24px 32px', maxWidth: 720, margin: '0 auto' }}>
        {/* Bandeau d'info */}
        <div style={{
          padding: 14, background: 'linear-gradient(135deg, #FFE8E2 0%, #F4E4C1 100%)',
          border: '1px solid rgba(196,69,54,0.3)', borderRadius: 14, marginBottom: 20,
          display: 'flex', gap: 12, alignItems: 'flex-start'
        }}>
          <div style={{ fontSize: 24 }}>🔐</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8B2E26' }}>Vous n'avez pas encore l'accès à ce dossier</div>
            <div style={{ fontSize: 12, color: '#5D4037', marginTop: 4, lineHeight: 1.5 }}>
              Conformément à la loi sénégalaise sur la protection des données personnelles, vous devez obtenir le consentement explicite de la patiente avant d'accéder à son dossier médical.
            </div>
          </div>
        </div>

        {/* Carte patiente */}
        <div style={cardStyle}>
          <div style={sectionLabelStyle}>Patiente trouvée</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18,
              background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)',
              color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700
            }}>
              {patient.first_name?.[0]}{patient.last_name?.[0]}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
                {patient.first_name} {patient.last_name}
              </div>
              <div style={{ fontSize: 12, color: '#8B6F5C', marginTop: 2, fontFamily: 'monospace' }}>{patient.ipu}</div>
              <div style={{ fontSize: 11, color: '#5D4037', marginTop: 4 }}>
                {patient.phone} {patient.city && `· ${patient.city}`}
              </div>
            </div>
          </div>
        </div>

        {success ? (
          <div style={{ ...cardStyle, marginTop: 16, textAlign: 'center', padding: 32 }}>
            <div style={{
              width: 70, height: 70, borderRadius: '50%',
              background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)',
              color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, margin: '0 auto', marginBottom: 16
            }}>📨</div>
            <h2 style={{ fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 600 }}>Demande envoyée !</h2>
            <p style={{ fontSize: 13, color: '#5D4037', marginTop: 10, lineHeight: 1.5 }}>
              {patient.first_name} reçoit immédiatement une notification sur son téléphone.<br/>
              Vous serez automatiquement notifié(e) dès qu'elle aura répondu.
            </p>
            <button onClick={() => setView({ name: 'home' })} style={{ ...primaryButtonStyle, marginTop: 24, maxWidth: 300 }}>
              Retour au dashboard
            </button>
          </div>
        ) : existingRequest && existingRequest.status === 'en_attente' ? (
          <div style={{ ...cardStyle, marginTop: 16, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Demande déjà en attente</div>
            <div style={{ fontSize: 12, color: '#5D4037', lineHeight: 1.5 }}>
              Vous avez envoyé une demande à {patient.first_name} le {new Date(existingRequest.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}. Elle n'a pas encore répondu.
            </div>
            <button onClick={() => setView({ name: 'home' })} style={{ ...primaryButtonStyle, marginTop: 20, maxWidth: 300 }}>
              Retour
            </button>
          </div>
        ) : (
          <>
            {existingRequest && existingRequest.status === 'refuse' && (
              <div style={{
                marginTop: 16, padding: 14, background: '#FFE8E2',
                border: '1px solid rgba(196,69,54,0.3)', borderRadius: 12,
                fontSize: 12, color: '#8B2E26', lineHeight: 1.5
              }}>
                ⚠️ Cette patiente a refusé votre précédente demande le {new Date(existingRequest.responded_at).toLocaleDateString('fr-FR')}. Vous pouvez en envoyer une nouvelle.
              </div>
            )}

            <div style={{ marginTop: 16, padding: 16, background: '#F5F1EB', borderRadius: 14, fontSize: 12, color: '#5D4037', lineHeight: 1.6 }}>
              ℹ️ <strong>Ce qui va se passer :</strong>
              <ol style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>{patient.first_name} reçoit une notification sur son téléphone</li>
                <li>Elle voit votre nom, votre rôle et votre structure</li>
                <li>Elle peut <strong>accepter</strong> ou <strong>refuser</strong> votre demande</li>
                <li>Si elle accepte, vous accédez à <strong>tout son dossier</strong> (grossesses, antécédents, CPN)</li>
              </ol>
            </div>

            {error && <div style={{ marginTop: 14, padding: 12, background: '#FFE8E2', borderRadius: 10, color: '#8B2E26', fontSize: 12, fontWeight: 600 }}>⚠️ {error}</div>}

            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button onClick={() => setView({ name: 'home' })} style={{ flex: 1, padding: 14, background: '#F5F1EB', color: '#5D4037', borderRadius: 14, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
              <button onClick={sendRequest} disabled={sending} style={{ flex: 2, ...primaryButtonStyle, background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', opacity: sending ? 0.6 : 1 }}>
                {sending ? '...' : '📨 Envoyer la demande de consentement'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

// =====================================================
// DASHBOARD HOME
// =====================================================
function DashboardHome({ profile, setView, openPatientDossier }) {
  const [searchInput, setSearchInput] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [myPatients, setMyPatients] = useState([])
  const [stats, setStats] = useState({ patients: 0, pregnancies: 0, alerts: 0 })
  const [activeAlerts, setActiveAlerts] = useState([])

  useEffect(() => { loadMyPatients(); loadStats(); loadActiveAlerts() }, [])

  useEffect(() => {
    if (!profile?.id) return

    // Polling de secours toutes les 10 secondes pour rattraper les événements ratés
    const pollInterval = setInterval(() => {
      loadMyPatients()
      loadStats()
      loadActiveAlerts()
    }, 10000)

    const channel = supabase.channel('pro-changes-' + profile.id)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        (payload) => {
          console.log('Realtime alerts:', payload)
          loadActiveAlerts()
          loadStats()
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'consents', filter: `granted_to=eq.${profile.id}` },
        (payload) => {
          console.log('Realtime consents:', payload)
          loadMyPatients()
          loadStats()
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'consent_requests', filter: `requested_by=eq.${profile.id}` },
        (payload) => {
          console.log('Realtime consent_requests:', payload)
          loadMyPatients()
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status)
      })

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  async function loadActiveAlerts() {
    const { data: consents } = await supabase.from('consents').select('woman_id').eq('granted_to', profile.id).eq('status', 'accorde')
    if (!consents || consents.length === 0) { setActiveAlerts([]); return }
    const womanIds = [...new Set(consents.map(c => c.woman_id))]
    const { data: alerts } = await supabase.from('alerts')
      .select('*, woman:profiles!alerts_woman_id_fkey(first_name, last_name, ipu, phone)')
      .in('woman_id', womanIds).eq('status', 'active').eq('type', 'sos')
      .order('created_at', { ascending: false })
    setActiveAlerts(alerts || [])
  }

  async function loadMyPatients() {
    // Étape 1 : récupérer les woman_id avec consentement
    const { data: consents, error: e1 } = await supabase
      .from('consents')
      .select('woman_id')
      .eq('granted_to', profile.id)
      .eq('status', 'accorde')
      .eq('scope', 'lecture_dossier')
  
    if (e1) { console.error('loadMyPatients consents error:', e1); return }
    if (!consents || consents.length === 0) { setMyPatients([]); return }
  
    const uniqueIds = [...new Set(consents.map(c => c.woman_id))]
  
    // Étape 2 : charger les profils
    const { data: patients, error: e2 } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, ipu, phone')
      .in('id', uniqueIds)
  
    if (e2) { console.error('loadMyPatients patients error:', e2); return }
  
    // Étape 3 : charger les grossesses pour chaque patiente
    const { data: pregnancies } = await supabase
      .from('pregnancies')
      .select('id, woman_id, status, last_period_date, expected_delivery_date, current_risk_level')
      .in('woman_id', uniqueIds)
  
    // Combiner profils + grossesses
    const patientsWithPregs = (patients || []).map(p => ({
      ...p,
      pregnancies: (pregnancies || []).filter(pr => pr.woman_id === p.id)
    }))
  
    setMyPatients(patientsWithPregs)
  }

  async function loadStats() {
    const { data } = await supabase.from('consents').select('woman_id').eq('granted_to', profile.id).eq('status', 'accorde')
    const unique = new Set(data?.map(c => c.woman_id) || [])
    const ids = Array.from(unique)
    let pregCount = 0, alertCount = 0
    if (ids.length > 0) {
      const { count: pc } = await supabase.from('pregnancies').select('*', { count: 'exact', head: true }).in('woman_id', ids).eq('status', 'en_cours')
      pregCount = pc || 0
      const { count: ac } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).in('woman_id', ids).eq('status', 'active').eq('type', 'sos')
      alertCount = ac || 0
    }
    setStats({ patients: unique.size, pregnancies: pregCount, alerts: alertCount })
  }

  async function handleSearch() {
    const ipu = searchInput.trim().toUpperCase()
    if (ipu.length < 6) return
    setSearchLoading(true); setSearchError(null)
    try {
      const { data, error } = await supabase.from('profiles').select('id').eq('ipu', ipu).eq('role', 'femme').maybeSingle()
      if (error) throw error
      if (!data) setSearchError(`Aucune patiente trouvée avec l'IPU ${ipu}`)
      else openPatientDossier(data.id)  // ⭐ Utilise le garde-frontière
    } catch (err) { setSearchError(err.message) } finally { setSearchLoading(false) }
  }

  async function handleLogout() { await supabase.auth.signOut() }
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={logoSmallStyle}>♥</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif', lineHeight: 1 }}>
              Yaay <span style={{ fontWeight: 400, fontStyle: 'italic', color: '#8B6F5C' }}>Pro</span>
            </div>
            <div style={{ fontSize: 10, color: '#8B6F5C', fontWeight: 600, marginTop: 2 }}>{profile.structure?.name || 'Structure non définie'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px 4px 4px', background: '#F5F1EB', borderRadius: 50 }}>
          <div style={avatarStyle}>{profile.first_name?.[0]}{profile.last_name?.[0]}</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.first_name} {profile.last_name}</div>
            <div style={{ fontSize: 10, color: '#8B6F5C' }}>{profile.role === 'sage_femme' ? 'Sage-femme' : 'Médecin'}</div>
          </div>
          <button onClick={handleLogout} style={{ marginLeft: 8, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#8B6F5C' }}>⏻</button>
        </div>
      </header>

      {activeAlerts.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', padding: '14px 32px', animation: 'pulse-alert 1.5s infinite' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 28 }}>🚨</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{activeAlerts.length} alerte{activeAlerts.length > 1 ? 's' : ''} SOS active{activeAlerts.length > 1 ? 's' : ''}</div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{activeAlerts.map(a => `${a.woman?.first_name} ${a.woman?.last_name}`).join(', ')}</div>
            </div>
            <button onClick={() => setView({ name: 'alert', data: activeAlerts[0].id })} style={{ padding: '10px 20px', background: '#FAF6F0', color: '#8B2E26', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>VOIR LA PREMIÈRE →</button>
          </div>
        </div>
      )}

      <main style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{today}</div>
            <h1 style={{ fontSize: 36, fontWeight: 600, fontFamily: 'Georgia, serif', marginTop: 4, lineHeight: 1.1 }}>
              Bonjour {profile.first_name},<br/>
              <span style={{ fontStyle: 'italic', color: '#C44536' }}>
                {stats.patients > 0 ? `${stats.patients} patiente${stats.patients > 1 ? 's' : ''} dans votre cohorte` : "aucune patiente pour l'instant"}
              </span>
            </h1>
          </div>
          <button onClick={() => setView({ name: 'enrollPatient' })} style={{
            padding: '14px 22px', background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)',
            color: '#FAF6F0', borderRadius: 14, fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 8px 20px rgba(196,69,54,0.3)', display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span style={{ fontSize: 18 }}>+</span> Nouvelle patiente
          </button>
        </div>

        <div style={searchHeroStyle}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,228,193,0.15) 0%, transparent 70%)' }}/>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, color: 'rgba(244,228,193,0.7)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Consulter une patiente</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#FAF6F0', marginTop: 6, fontFamily: 'Georgia, serif' }}>Saisissez l'IPU de la patiente</div>
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, background: '#FAF6F0', borderRadius: 16, padding: 6 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F4E4C1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔍</div>
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="SN-2026-XXXXXX" style={{ flex: 1, padding: '12px 0', fontSize: 17, fontWeight: 600, color: '#2a1810', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit' }}/>
              <button onClick={handleSearch} disabled={searchInput.length < 6 || searchLoading} style={{ padding: '12px 24px', background: searchInput.length >= 6 ? 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)' : 'rgba(42,24,16,0.1)', color: searchInput.length >= 6 ? '#FAF6F0' : '#8B6F5C', borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: searchInput.length >= 6 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>{searchLoading ? '...' : 'Ouvrir'}</button>
            </div>
          </div>
        </div>

        {searchError && <div style={{ marginTop: 16, padding: 16, background: '#FFE8E2', borderRadius: 14, color: '#8B2E26', fontSize: 13, fontWeight: 600 }}>⚠️ {searchError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 24 }}>
          <StatCard icon="👥" label="Cohorte active" value={stats.patients} bg="#FFE8E2"/>
          <StatCard icon="🤰" label="Grossesses en cours" value={stats.pregnancies} bg="#DDEBE9"/>
          <StatCard icon="🚨" label="Alertes SOS actives" value={stats.alerts} bg="#FFE8E2" highlight={stats.alerts > 0}/>
        </div>

        {activeAlerts.length > 0 && (
          <div style={{ marginTop: 24, background: '#FFFFFF', borderRadius: 20, padding: 20, border: '2px solid #C44536' }}>
            <div style={{ fontSize: 11, color: '#C44536', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>🚨 Urgent</div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 16, color: '#8B2E26' }}>Alertes en cours</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeAlerts.map(alert => (
                <button key={alert.id} onClick={() => setView({ name: 'alert', data: alert.id })} style={{ background: 'linear-gradient(135deg, #FFE8E2 0%, #FAF6F0 100%)', border: '2px solid #C44536', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 14, width: '100%', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#C44536', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, animation: 'pulse-alert 1s infinite' }}>🚨</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{alert.woman?.first_name} {alert.woman?.last_name}</div>
                    <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2, fontFamily: 'monospace' }}>{alert.woman?.ipu}</div>
                    <div style={{ fontSize: 11, color: '#8B2E26', marginTop: 4, fontWeight: 600 }}>il y a {Math.round((new Date() - new Date(alert.created_at)) / 60000)} min</div>
                  </div>
                  <div style={{ color: '#C44536', fontSize: 18 }}>→</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, background: '#FFFFFF', borderRadius: 20, padding: 20, border: '1px solid rgba(42,24,16,0.04)' }}>
          <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Ma cohorte</div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 16 }}>Mes patientes</div>
          {myPatients.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#8B6F5C', fontSize: 13 }}>
              Aucune patiente. Cliquez sur <strong>"+ Nouvelle patiente"</strong> pour enrôler votre première patiente.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myPatients.map(p => {
                const preg = p.pregnancies?.find(pr => pr.status === 'en_cours')
                const weeks = preg ? Math.floor((new Date() - new Date(preg.last_period_date)) / (1000 * 60 * 60 * 24 * 7)) : 0
                return (
                  <button key={p.id} onClick={() => openPatientDossier(p.id)} style={patientRowStyle}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{p.first_name?.[0]}{p.last_name?.[0]}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{p.first_name} {p.last_name}</div>
                      <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2, display: 'flex', gap: 10 }}>
                        <span style={{ fontFamily: 'monospace' }}>{p.ipu}</span>
                        {preg ? <span>· S{weeks}</span> : <span>· Pas de grossesse</span>}
                      </div>
                    </div>
                    <span style={{ color: '#B8A89A' }}>→</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// =====================================================
// ENROLL PATIENT VIEW
// =====================================================
function EnrollPatientView({ profile, setView, openPatientDossier }) {
  const [tab, setTab] = useState('create')

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView({ name: 'home' })} style={backButtonStyle}>← Retour</button>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Enrôler une patiente</div>
          <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2 }}>3 façons d'ajouter une patiente à votre cohorte</div>
        </div>
      </header>
      <main style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(42,24,16,0.08)', marginBottom: 24 }}>
          {[
            { id: 'create', label: '📝 Créer un nouveau dossier', desc: 'La patiente est nouvelle' },
            { id: 'existing', label: '🔍 La patiente a déjà Yaay', desc: 'Avec son IPU' },
            { id: 'search', label: '👥 Rechercher', desc: 'Anti-doublons' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '14px 18px', fontSize: 13, fontWeight: 600,
              color: tab === t.id ? '#C44536' : '#8B6F5C',
              borderBottom: tab === t.id ? '2px solid #C44536' : '2px solid transparent',
              marginBottom: -1, background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left'
            }}>
              <div>{t.label}</div>
              <div style={{ fontSize: 10, color: '#8B6F5C', marginTop: 2, fontWeight: 400 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {tab === 'create' && <CreatePatientForm profile={profile} setView={setView}/>}
        {tab === 'existing' && <RequestExistingPatientForm profile={profile} setView={setView} openPatientDossier={openPatientDossier}/>}
        {tab === 'search' && <SearchExistingPatientForm profile={profile} openPatientDossier={openPatientDossier}/>}
      </main>
    </div>
  )
}

function CreatePatientForm({ profile, setView }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [language, setLanguage] = useState('fr')
  const [gravidity, setGravidity] = useState('1')
  const [parity, setParity] = useState('0')
  const [hasHypertension, setHasHypertension] = useState(false)
  const [hasDiabetes, setHasDiabetes] = useState(false)
  const [hasHiv, setHasHiv] = useState(false)
  const [hasSickleCell, setHasSickleCell] = useState(false)
  const [hasPreviousCsection, setHasPreviousCsection] = useState(false)
  const [hasPreviousHemorrhage, setHasPreviousHemorrhage] = useState(false)
  const [hasPreviousPreeclampsia, setHasPreviousPreeclampsia] = useState(false)
  const [hasPregnancy, setHasPregnancy] = useState(true)
  const [lastPeriod, setLastPeriod] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data: result, error: rpcError } = await supabase.rpc('create_patient_by_pro', {
        p_first_name: firstName, p_last_name: lastName, p_phone: '+221' + phone,
        p_date_of_birth: dob || null, p_city: city || null, p_region: region || null,
        p_blood_type: bloodType || null, p_preferred_language: language
      })
      if (rpcError) throw rpcError
      if (!result || result.length === 0) throw new Error('La création a échoué')
      const newPatient = result[0]

      if (hasPregnancy && lastPeriod) {
        const ddr = new Date(lastPeriod)
        const term = new Date(ddr)
        term.setDate(term.getDate() + 280)
        const { error: pregError } = await supabase.from('pregnancies').insert({
          woman_id: newPatient.patient_id, status: 'en_cours',
          last_period_date: lastPeriod, expected_delivery_date: term.toISOString().split('T')[0],
          gravidity: parseInt(gravidity), parity: parseInt(parity),
          blood_type: bloodType || null,
          has_hypertension: hasHypertension, has_diabetes: hasDiabetes,
          has_hiv: hasHiv, has_sickle_cell: hasSickleCell,
          has_previous_csection: hasPreviousCsection, has_previous_hemorrhage: hasPreviousHemorrhage,
          has_previous_preeclampsia: hasPreviousPreeclampsia,
          current_risk_level: (hasHypertension || hasDiabetes || hasPreviousHemorrhage || hasPreviousPreeclampsia) ? 'modere' : 'faible',
          created_by: profile.id
        })
        if (pregError) throw pregError
      }
      setSuccess({ ipu: newPatient.ipu, patientId: newPatient.patient_id })
      setLoading(false)
    } catch (err) { setError(err.message); setLoading(false) }
  }

  if (success) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto', marginBottom: 20 }}>✓</div>
        <h2 style={{ fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 600 }}>Patiente créée !</h2>
        <p style={{ fontSize: 14, color: '#5D4037', marginTop: 12 }}>{firstName} {lastName} est dans votre cohorte.</p>
        <div style={{ marginTop: 20, padding: 16, background: '#F4E4C1', borderRadius: 14 }}>
          <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>IPU à donner à la patiente</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color: '#2a1810', marginTop: 6 }}>{success.ipu}</div>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button onClick={() => setView({ name: 'patient', data: success.patientId })} style={{ ...primaryButtonStyle, flex: 1 }}>Voir le dossier →</button>
          <button onClick={() => setView({ name: 'home' })} style={{ ...primaryButtonStyle, flex: 1, background: '#F5F1EB', color: '#5D4037', boxShadow: 'none' }}>Retour</button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={cardStyle}>
        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 16 }}>1. Identité</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={labelStyle}>Prénom *</label><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle}/></div>
          <div><label style={labelStyle}>Nom *</label><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle}/></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
          <div>
            <label style={labelStyle}>Téléphone *</label>
            <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', borderRadius: 12, border: '2px solid rgba(42,24,16,0.08)', overflow: 'hidden' }}>
              <span style={{ padding: '11px 12px', fontWeight: 600, borderRight: '1px solid rgba(42,24,16,0.1)', fontSize: 13 }}>🇸🇳 +221</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="77 123 45 67" required style={{ ...inputStyle, border: 'none' }}/>
            </div>
          </div>
          <div><label style={labelStyle}>Date de naissance</label><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={inputStyle}/></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 14 }}>
          <div><label style={labelStyle}>Ville</label><input type="text" value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Région</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)} style={inputStyle}>
              <option value="">—</option>
              {['Dakar','Thiès','Diourbel','Fatick','Kaffrine','Kaolack','Kédougou','Kolda','Louga','Matam','Saint-Louis','Sédhiou','Tambacounda','Ziguinchor'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Groupe sanguin</label>
            <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} style={inputStyle}>
              <option value="">—</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 16 }}>2. Antécédents</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={labelStyle}>Gestité (G)</label><input type="number" min="1" value={gravidity} onChange={(e) => setGravidity(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Parité (P)</label><input type="number" min="0" value={parity} onChange={(e) => setParity(e.target.value)} style={inputStyle}/></div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <CheckboxField label="HTA" checked={hasHypertension} onChange={setHasHypertension}/>
            <CheckboxField label="Diabète" checked={hasDiabetes} onChange={setHasDiabetes}/>
            <CheckboxField label="VIH" checked={hasHiv} onChange={setHasHiv}/>
            <CheckboxField label="Drépanocytose" checked={hasSickleCell} onChange={setHasSickleCell}/>
            <CheckboxField label="Antécédent césarienne" checked={hasPreviousCsection} onChange={setHasPreviousCsection}/>
            <CheckboxField label="Antécédent HPP" checked={hasPreviousHemorrhage} onChange={setHasPreviousHemorrhage}/>
            <CheckboxField label="Pré-éclampsie" checked={hasPreviousPreeclampsia} onChange={setHasPreviousPreeclampsia}/>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 16 }}>3. Grossesse actuelle</div>
        <div style={{ display: 'flex', gap: 4, background: '#F5F1EB', borderRadius: 10, padding: 3, marginBottom: 14 }}>
          <button type="button" onClick={() => setHasPregnancy(true)} style={{ flex: 1, padding: 10, borderRadius: 8, background: hasPregnancy ? '#C44536' : 'transparent', color: hasPregnancy ? '#FAF6F0' : '#5D4037', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Grossesse en cours</button>
          <button type="button" onClick={() => setHasPregnancy(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: !hasPregnancy ? '#FFFFFF' : 'transparent', color: !hasPregnancy ? '#2a1810' : '#5D4037', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Pas de grossesse</button>
        </div>
        {hasPregnancy && (
          <div>
            <label style={labelStyle}>DDR *</label>
            <input type="date" value={lastPeriod} onChange={(e) => setLastPeriod(e.target.value)} required={hasPregnancy} style={inputStyle}/>
          </div>
        )}
      </div>

      {error && <div style={{ marginTop: 16, padding: 14, background: '#FFE8E2', borderRadius: 12, color: '#8B2E26', fontSize: 13, fontWeight: 600 }}>⚠️ {error}</div>}

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <button type="button" onClick={() => setView({ name: 'home' })} style={{ flex: 1, padding: 14, background: '#F5F1EB', color: '#5D4037', borderRadius: 14, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
        <button type="submit" disabled={loading} style={{ flex: 2, ...primaryButtonStyle, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', boxShadow: '0 6px 16px rgba(196,69,54,0.3)', opacity: loading ? 0.6 : 1 }}>
          {loading ? '...' : '✓ Créer la patiente'}
        </button>
      </div>
    </form>
  )
}

function RequestExistingPatientForm({ profile, setView, openPatientDossier }) {
  const [ipu, setIpu] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('profiles')
        .select('id').eq('ipu', ipu.trim().toUpperCase())
        .eq('role', 'femme').maybeSingle()
      if (error) throw error
      if (!data) {
        setError(`Aucune patiente trouvée avec l'IPU ${ipu.toUpperCase()}`)
      } else {
        // ⭐ Garde-frontière : openPatientDossier vérifie automatiquement
        openPatientDossier(data.id)
      }
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 8 }}>Patiente déjà inscrite sur Yaay</div>
      <p style={{ fontSize: 13, color: '#5D4037', marginBottom: 16 }}>
        Tapez l'IPU. Si vous avez déjà l'accès, le dossier s'ouvre. Sinon, vous serez redirigé(e) vers une demande de consentement.
      </p>
      <form onSubmit={handleSearch}>
        <label style={labelStyle}>IPU de la patiente</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" value={ipu} onChange={(e) => setIpu(e.target.value.toUpperCase())} placeholder="SN-2026-XXXXXX" required style={{ ...inputStyle, fontFamily: 'monospace', flex: 1 }}/>
          <button type="submit" disabled={loading || ipu.length < 6} style={{ padding: '12px 24px', background: ipu.length >= 6 ? 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)' : '#F5F1EB', color: ipu.length >= 6 ? '#FAF6F0' : '#8B6F5C', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: ipu.length >= 6 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
            {loading ? '...' : 'Ouvrir'}
          </button>
        </div>
      </form>
      {error && <div style={{ marginTop: 14, padding: 12, background: '#FFE8E2', borderRadius: 10, color: '#8B2E26', fontSize: 12, fontWeight: 600 }}>⚠️ {error}</div>}
    </div>
  )
}

function SearchExistingPatientForm({ profile, openPatientDossier }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (query.length < 2) return
    setLoading(true)
    const { data } = await supabase.from('profiles')
      .select('id, first_name, last_name, ipu, phone, city')
      .eq('role', 'femme')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(20)
    setResults(data || [])
    setLoading(false)
  }

  return (
    <div>
      <div style={cardStyle}>
        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 8 }}>Rechercher dans la base</div>
        <p style={{ fontSize: 13, color: '#5D4037', marginBottom: 16 }}>
          Évite les doublons. Si la patiente existe et que vous n'avez pas l'accès, vous serez redirigé(e) vers une demande de consentement.
        </p>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, prénom ou téléphone" style={{ ...inputStyle, flex: 1 }}/>
            <button type="submit" disabled={loading || query.length < 2} style={{ padding: '12px 24px', background: query.length >= 2 ? 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)' : '#F5F1EB', color: query.length >= 2 ? '#FAF6F0' : '#8B6F5C', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: query.length >= 2 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
              {loading ? '...' : '🔍 Rechercher'}
            </button>
          </div>
        </form>
      </div>

      {results.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <div style={{ fontSize: 12, color: '#8B6F5C', marginBottom: 12 }}>{results.length} résultat{results.length > 1 ? 's' : ''}</div>
          {results.map(p => (
            <button key={p.id} onClick={() => openPatientDossier(p.id)} style={{ ...patientRowStyle, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{p.first_name?.[0]}{p.last_name?.[0]}</div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{p.first_name} {p.last_name}</div>
                <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2, display: 'flex', gap: 10 }}>
                  <span style={{ fontFamily: 'monospace' }}>{p.ipu}</span>
                  <span>· {p.phone}</span>
                </div>
              </div>
              <span style={{ color: '#B8A89A' }}>→</span>
            </button>
          ))}
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <div style={{ ...cardStyle, marginTop: 16, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Aucune patiente trouvée pour "{query}"</div>
        </div>
      )}
    </div>
  )
}

// =====================================================
// PATIENT FILE VIEW
// =====================================================
function PatientFileView({ profile, patientId, setView }) {
  const [patient, setPatient] = useState(null)
  const [currentPregnancy, setCurrentPregnancy] = useState(null)
  const [pastPregnancies, setPastPregnancies] = useState([])
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => { loadPatient() }, [patientId])

  async function loadPatient() {
    setLoading(true)
    const { data: p } = await supabase.from('profiles').select('*').eq('id', patientId).single()
    setPatient(p)
    const { data: pregs } = await supabase.from('pregnancies').select('*').eq('woman_id', patientId).order('last_period_date', { ascending: false })
    if (pregs) {
      setCurrentPregnancy(pregs.find(p => p.status === 'en_cours'))
      setPastPregnancies(pregs.filter(p => p.status !== 'en_cours'))
      const current = pregs.find(p => p.status === 'en_cours')
      if (current) {
        const { data: cpns } = await supabase.from('consultations')
          .select('*, performed_by_profile:profiles!consultations_performed_by_fkey(first_name, last_name)')
          .eq('pregnancy_id', current.id).order('consultation_date', { ascending: false })
        setConsultations(cpns || [])
      }
    }
    setLoading(false)
  }

  if (loading) return <LoadingScreen />
  if (!patient) return <div>Patiente introuvable.</div>

  const weeks = currentPregnancy ? Math.floor((new Date() - new Date(currentPregnancy.last_period_date)) / (1000 * 60 * 60 * 24 * 7)) : null
  const age = patient.date_of_birth ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25)) : null

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView({ name: 'home' })} style={backButtonStyle}>← Retour</button>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>{patient.first_name} {patient.last_name}</div>
          <div style={{ fontSize: 11, color: '#8B6F5C', display: 'flex', gap: 10, marginTop: 2 }}>
            <span style={{ fontFamily: 'monospace' }}>{patient.ipu}</span>
            {age && <span>· {age} ans</span>}
            {currentPregnancy && <span>· G{currentPregnancy.gravidity}P{currentPregnancy.parity} · S{weeks}</span>}
          </div>
        </div>
        {currentPregnancy ? (
          <button onClick={() => setView({ name: 'newCPN', data: { pregnancyId: currentPregnancy.id, patientId } })} style={{ padding: '12px 18px', background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>➕ Nouvelle CPN</button>
        ) : (
          <button onClick={() => setView({ name: 'newPregnancy', data: patientId })} style={{ padding: '12px 18px', background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', color: '#FAF6F0', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Démarrer une grossesse</button>
        )}
      </header>

      <main style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(42,24,16,0.08)', marginBottom: 24 }}>
          {[{ id: 'overview', label: "Vue d'ensemble" }, { id: 'cpn', label: `CPN actuelle (${consultations.length})` }, { id: 'history', label: `Historique (${pastPregnancies.length})` }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '12px 18px', fontSize: 13, fontWeight: 600, color: tab === t.id ? '#C44536' : '#8B6F5C', borderBottom: tab === t.id ? '2px solid #C44536' : '2px solid transparent', marginBottom: -1, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Informations</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
                <InfoItem label="Téléphone" value={patient.phone}/>
                <InfoItem label="Localisation" value={`${patient.city || '—'}, ${patient.region || '—'}`}/>
                <InfoItem label="Langue" value={patient.preferred_language || 'fr'}/>
              </div>
            </div>
            {currentPregnancy && (
              <div style={{ background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', borderRadius: 20, padding: 24, color: '#FAF6F0' }}>
                <div style={{ fontSize: 11, color: 'rgba(244,228,193,0.7)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Grossesse en cours</div>
                <div style={{ fontSize: 40, fontWeight: 600, fontFamily: 'Georgia, serif', marginTop: 8, lineHeight: 1 }}>Semaine {weeks}</div>
                <div style={{ fontSize: 13, color: 'rgba(244,228,193,0.8)', marginTop: 4 }}>Terme : {new Date(currentPregnancy.expected_delivery_date).toLocaleDateString('fr-FR')}</div>
              </div>
            )}
          </div>
        )}

        {tab === 'cpn' && (
          <div style={cardStyle}>
            {consultations.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#8B6F5C' }}>Aucune CPN.</div>
            ) : (
              consultations.map(c => (
                <div key={c.id} style={{ background: '#F5F1EB', borderRadius: 12, padding: 14, display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr) 1fr', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{new Date(c.consultation_date).toLocaleDateString('fr-FR')}</div>
                    <div style={{ fontSize: 10, color: '#8B6F5C' }}>S{c.gestational_age_weeks || '—'}</div>
                  </div>
                  <div style={{ fontSize: 12 }}>Poids: <strong>{c.weight_kg || '—'}</strong></div>
                  <div style={{ fontSize: 12 }}>TA: <strong>{c.blood_pressure_systolic && c.blood_pressure_diastolic ? `${c.blood_pressure_systolic}/${c.blood_pressure_diastolic}` : '—'}</strong></div>
                  <div style={{ fontSize: 12 }}>HU: <strong>{c.uterine_height_cm || '—'}</strong></div>
                  <div style={{ fontSize: 12 }}>BCF: <strong>{c.fetal_heart_rate || '—'}</strong></div>
                  <div style={{ fontSize: 11, color: '#8B6F5C', textAlign: 'right' }}>par {c.performed_by_profile?.first_name?.[0] || '—'}.</div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'history' && (
          <div style={cardStyle}>
            {pastPregnancies.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#8B6F5C' }}>Aucune grossesse antérieure.</div>
            ) : pastPregnancies.map(p => (
              <div key={p.id} style={{ background: '#F5F1EB', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Grossesse de {new Date(p.last_period_date).getFullYear()}</div>
                <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2 }}>DDR : {new Date(p.last_period_date).toLocaleDateString('fr-FR')} · {p.status}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// =====================================================
// NEW PREGNANCY VIEW
// =====================================================
function NewPregnancyView({ profile, patientId, setView }) {
  const [patient, setPatient] = useState(null)
  const [lastPeriod, setLastPeriod] = useState('')
  const [gravidity, setGravidity] = useState('1')
  const [parity, setParity] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', patientId).single().then(({ data }) => setPatient(data))
  }, [patientId])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const ddr = new Date(lastPeriod)
    const term = new Date(ddr)
    term.setDate(term.getDate() + 280)
    try {
      const { error } = await supabase.from('pregnancies').insert({
        woman_id: patientId, status: 'en_cours',
        last_period_date: lastPeriod, expected_delivery_date: term.toISOString().split('T')[0],
        gravidity: parseInt(gravidity), parity: parseInt(parity),
        current_risk_level: 'faible', created_by: profile.id
      })
      if (error) throw error
      setView({ name: 'patient', data: patientId })
    } catch (err) { setError(err.message); setLoading(false) }
  }

  if (!patient) return <LoadingScreen/>

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView({ name: 'patient', data: patientId })} style={backButtonStyle}>← Retour</button>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Démarrer une grossesse · {patient.first_name} {patient.last_name}</div>
        </div>
      </header>
      <main style={{ padding: '24px 32px', maxWidth: 800, margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div style={cardStyle}>
            <label style={labelStyle}>DDR *</label>
            <input type="date" value={lastPeriod} onChange={(e) => setLastPeriod(e.target.value)} required style={inputStyle}/>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              <div><label style={labelStyle}>Gestité</label><input type="number" min="1" value={gravidity} onChange={(e) => setGravidity(e.target.value)} style={inputStyle}/></div>
              <div><label style={labelStyle}>Parité</label><input type="number" min="0" value={parity} onChange={(e) => setParity(e.target.value)} style={inputStyle}/></div>
            </div>
          </div>
          {error && <div style={{ marginTop: 16, padding: 14, background: '#FFE8E2', borderRadius: 12, color: '#8B2E26' }}>⚠️ {error}</div>}
          <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, marginTop: 20, opacity: loading ? 0.6 : 1 }}>
            {loading ? '...' : '✓ Démarrer la grossesse'}
          </button>
        </form>
      </main>
    </div>
  )
}

// =====================================================
// NEW CPN VIEW
// =====================================================
// =====================================================
// NEW CPN VIEW - VERSION COMPLÈTE
// À remplacer dans votre App.js de Yaay Pro
// =====================================================

function NewCPNView({ profile, pregnancyId, patientId, setView }) {
  const [pregnancy, setPregnancy] = useState(null)
  const [patient, setPatient] = useState(null)
  const [lastCPN, setLastCPN] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Constantes
  const [weight, setWeight] = useState('')
  const [bpSys, setBpSys] = useState('')
  const [bpDia, setBpDia] = useState('')
  const [uh, setUh] = useState('')
  const [bcf, setBcf] = useState('')
  const [temperature, setTemperature] = useState('')

  // Examens biologiques (cochés si réalisés)
  const [examsRealized, setExamsRealized] = useState({
    groupage: false,
    vih: false,
    syphilis: false,
    hepatiteB: false,
    glycemie: false,
    nfs: false,
    ecbu: false,
    albumineSucre: false,
    toxoplasmose: false,
  })

  // Médicaments
  const [medications, setMedications] = useState({
    ferFolate: false,
    sp: false,
    calcium: false,
    vat: false,
  })

  // Symptômes/signes de danger
  const [symptoms, setSymptoms] = useState({
    saignements: false,
    cephalees: false,
    troublesVisuels: false,
    oedemes: false,
    fievre: false,
    diminutionMaf: false,
  })

  const [observations, setObservations] = useState('')
  const [nextDate, setNextDate] = useState('')

  useEffect(() => { loadData() }, [pregnancyId])

  async function loadData() {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', patientId).single()
    setPatient(p)
    const { data: preg } = await supabase.from('pregnancies').select('*').eq('id', pregnancyId).single()
    setPregnancy(preg)

    // Récupérer la dernière CPN pour comparaison
    const { data: cpns } = await supabase.from('consultations')
      .select('*')
      .eq('pregnancy_id', pregnancyId)
      .order('consultation_date', { ascending: false })
      .limit(1)
    if (cpns && cpns.length > 0) {
      setLastCPN(cpns[0])
    }

    // Date du prochain RDV par défaut (28 jours)
    const next = new Date()
    next.setDate(next.getDate() + 28)
    setNextDate(next.toISOString().split('T')[0])
    setLoading(false)
  }

  // Calculs et alertes
  const tensionAlert = (parseInt(bpSys) >= 14 || parseInt(bpDia) >= 9) && bpSys && bpDia
  const tensionAlertSevere = (parseInt(bpSys) >= 16 || parseInt(bpDia) >= 11) && bpSys && bpDia
  const fevreAlert = parseFloat(temperature) >= 38 && temperature
  const weightDelta = lastCPN?.weight_kg && weight ? (parseFloat(weight) - lastCPN.weight_kg).toFixed(1) : null

  // Pré-éclampsie : HTA + au moins 1 symptôme
  const preeclampsiaSigns = tensionAlert && (symptoms.cephalees || symptoms.troublesVisuels || symptoms.oedemes)

  // Au moins un signe de danger
  const dangerSigns = Object.values(symptoms).some(v => v)

  async function handleSave() {
    setSaving(true)
    setError(null)

    const weeks = pregnancy ? Math.floor((new Date() - new Date(pregnancy.last_period_date)) / (1000 * 60 * 60 * 24 * 7)) : null

    try {
      // 1. Construire les observations enrichies
      let fullObservations = observations || ''

      const examsList = Object.entries(examsRealized).filter(([_, v]) => v).map(([k]) => k)
      if (examsList.length > 0) {
        fullObservations += `\n\nExamens réalisés : ${examsList.join(', ')}`
      }

      const medsList = Object.entries(medications).filter(([_, v]) => v).map(([k]) => k)
      if (medsList.length > 0) {
        fullObservations += `\n\nMédicaments : ${medsList.join(', ')}`
      }

      const symptomsList = Object.entries(symptoms).filter(([_, v]) => v).map(([k]) => k)
      if (symptomsList.length > 0) {
        fullObservations += `\n\n⚠️ Signes/symptômes : ${symptomsList.join(', ')}`
      }

      // 2. Insérer la consultation
      const { error: insertError } = await supabase.from('consultations').insert({
        pregnancy_id: pregnancyId,
        performed_by: profile.id,
        structure_id: profile.structure_id,
        consultation_date: new Date().toISOString(),
        gestational_age_weeks: weeks,
        weight_kg: weight ? parseFloat(weight) : null,
        blood_pressure_systolic: bpSys ? parseInt(bpSys) : null,
        blood_pressure_diastolic: bpDia ? parseInt(bpDia) : null,
        uterine_height_cm: uh ? parseFloat(uh) : null,
        fetal_heart_rate: bcf ? parseInt(bcf) : null,
        temperature_celsius: temperature ? parseFloat(temperature) : null,
        observations: fullObservations.trim() || null,
        next_appointment_date: nextDate || null,
        validated: true,
        validated_at: new Date().toISOString()
      })

      if (insertError) throw insertError

      // 3. Mettre à jour le niveau de risque selon les alertes
      let newRiskLevel = pregnancy?.current_risk_level || 'faible'
      if (tensionAlertSevere || preeclampsiaSigns) newRiskLevel = 'tres_eleve'
      else if (tensionAlert || dangerSigns) newRiskLevel = 'eleve'
      else if (fevreAlert) newRiskLevel = 'modere'

      if (newRiskLevel !== pregnancy?.current_risk_level) {
        await supabase.from('pregnancies')
          .update({ current_risk_level: newRiskLevel })
          .eq('id', pregnancyId)
      }

      // 4. Créer le prochain RDV
      if (nextDate) {
        await supabase.from('appointments').insert({
          pregnancy_id: pregnancyId,
          structure_id: profile.structure_id,
          appointment_date: new Date(nextDate).toISOString(),
          type: 'cpn',
          status: 'planifie'
        })
      }

      setView({ name: 'patient', data: patientId })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) return <LoadingScreen/>

  const weeks = pregnancy ? Math.floor((new Date() - new Date(pregnancy.last_period_date)) / (1000 * 60 * 60 * 24 * 7)) : null
  const age = patient?.date_of_birth ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25)) : null

  // Liste des antécédents pour le bandeau
  const antecedents = []
  if (pregnancy?.has_hypertension) antecedents.push({ label: 'HTA', severity: 'high' })
  if (pregnancy?.has_diabetes) antecedents.push({ label: 'Diabète', severity: 'high' })
  if (pregnancy?.has_hiv) antecedents.push({ label: 'VIH', severity: 'medium' })
  if (pregnancy?.has_sickle_cell) antecedents.push({ label: 'Drépanocytose', severity: 'high' })
  if (pregnancy?.has_previous_csection) antecedents.push({ label: 'Antécédent césarienne', severity: 'medium' })
  if (pregnancy?.has_previous_hemorrhage) antecedents.push({ label: 'Antécédent HPP', severity: 'high' })
  if (pregnancy?.has_previous_preeclampsia) antecedents.push({ label: 'Pré-éclampsie ant.', severity: 'high' })

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView({ name: 'patient', data: patientId })} style={backButtonStyle}>✕ Annuler</button>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
            Nouvelle CPN · {patient?.first_name} {patient?.last_name}
          </div>
          <div style={{ fontSize: 11, color: '#8B6F5C', display: 'flex', gap: 10, marginTop: 2 }}>
            <span style={{ fontFamily: 'monospace' }}>{patient?.ipu}</span>
            {age && <span>· {age} ans</span>}
            {pregnancy && <span>· G{pregnancy.gravidity}P{pregnancy.parity}</span>}
            {weeks && <span>· S{weeks}</span>}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)',
          color: '#FAF6F0', borderRadius: 12, fontSize: 13, fontWeight: 700,
          border: 'none', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit',
          opacity: saving ? 0.6 : 1
        }}>{saving ? '...' : '💾 Valider la CPN'}</button>
      </header>

      <main style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        {error && (
          <div style={{ padding: 14, background: '#FFE8E2', borderRadius: 12, color: '#8B2E26', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {/* BANDEAU ANTÉCÉDENTS - Toujours visible */}
        {antecedents.length > 0 && (
          <div style={{
            padding: 14,
            background: 'linear-gradient(135deg, #FFE8E2 0%, #F4E4C1 100%)',
            border: '1px solid rgba(196,69,54,0.3)',
            borderRadius: 14, marginBottom: 16
          }}>
            <div style={{ fontSize: 11, color: '#8B2E26', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
              ⚠️ Antécédents à surveiller
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {antecedents.map((a, i) => (
                <div key={i} style={{
                  padding: '6px 12px',
                  background: a.severity === 'high' ? '#C44536' : '#D4A574',
                  color: '#FAF6F0',
                  borderRadius: 8, fontSize: 12, fontWeight: 600
                }}>{a.label}</div>
              ))}
            </div>
          </div>
        )}

        {/* DERNIÈRE CPN - Pour comparaison */}
        {lastCPN && (
          <div style={{
            padding: 14,
            background: '#F5F1EB',
            borderRadius: 14, marginBottom: 16,
            display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              📊 Dernière CPN ({new Date(lastCPN.consultation_date).toLocaleDateString('fr-FR')})
            </div>
            {lastCPN.weight_kg && <div style={{ fontSize: 12 }}>Poids: <strong>{lastCPN.weight_kg} kg</strong></div>}
            {lastCPN.blood_pressure_systolic && <div style={{ fontSize: 12 }}>TA: <strong>{lastCPN.blood_pressure_systolic}/{lastCPN.blood_pressure_diastolic}</strong></div>}
            {lastCPN.uterine_height_cm && <div style={{ fontSize: 12 }}>HU: <strong>{lastCPN.uterine_height_cm} cm</strong></div>}
            {lastCPN.fetal_heart_rate && <div style={{ fontSize: 12 }}>BCF: <strong>{lastCPN.fetal_heart_rate}</strong></div>}
          </div>
        )}

        {/* SECTION 1 - CONSTANTES */}
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 4 }}>1. Constantes</div>
          <div style={{ fontSize: 12, color: '#8B6F5C', marginBottom: 16 }}>Mesures cliniques du jour</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div>
              <label style={labelStyle}>Poids (kg)</label>
              <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="65.5" style={inputStyle}/>
              {weightDelta !== null && (
                <div style={{ fontSize: 10, color: parseFloat(weightDelta) > 2 ? '#C44536' : '#5D4037', marginTop: 4, fontWeight: 600 }}>
                  {parseFloat(weightDelta) > 0 ? '+' : ''}{weightDelta} kg vs dernière CPN
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Tension artérielle</label>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input type="number" value={bpSys} onChange={(e) => setBpSys(e.target.value)} placeholder="11" style={{...inputStyle, textAlign: 'center', borderColor: tensionAlertSevere ? '#C44536' : tensionAlert ? '#D4A574' : 'rgba(42,24,16,0.08)', borderWidth: tensionAlert ? '2px' : '2px'}}/>
                <span style={{padding: 12, fontSize: 17, fontWeight: 700}}>/</span>
                <input type="number" value={bpDia} onChange={(e) => setBpDia(e.target.value)} placeholder="7" style={{...inputStyle, textAlign: 'center', borderColor: tensionAlertSevere ? '#C44536' : tensionAlert ? '#D4A574' : 'rgba(42,24,16,0.08)'}}/>
              </div>
              {tensionAlertSevere ? (
                <div style={{fontSize: 10, color: '#C44536', marginTop: 4, fontWeight: 700}}>
                  🚨 HTA SÉVÈRE - Référer immédiatement
                </div>
              ) : tensionAlert ? (
                <div style={{fontSize: 10, color: '#8B2E26', marginTop: 4, fontWeight: 600}}>
                  ⚠ HTA gravidique
                </div>
              ) : null}
            </div>
            <div>
              <label style={labelStyle}>Température (°C)</label>
              <input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="36.8" style={{...inputStyle, borderColor: fevreAlert ? '#C44536' : 'rgba(42,24,16,0.08)'}}/>
              {fevreAlert && <div style={{fontSize: 10, color: '#C44536', marginTop: 4, fontWeight: 600}}>⚠ Fièvre - Investiguer</div>}
            </div>
            <div>
              <label style={labelStyle}>Hauteur utérine (cm)</label>
              <input type="number" step="0.5" value={uh} onChange={(e) => setUh(e.target.value)} placeholder="28" style={inputStyle}/>
              {weeks && uh && Math.abs(parseFloat(uh) - weeks) > 4 && (
                <div style={{fontSize: 10, color: '#8B2E26', marginTop: 4, fontWeight: 600}}>
                  ⚠ HU/SA discordant ({weeks} SA attendu ≈ {weeks} cm)
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>BCF (bpm)</label>
              <input type="number" value={bcf} onChange={(e) => setBcf(e.target.value)} placeholder="140" style={{...inputStyle, borderColor: bcf && (parseInt(bcf) < 110 || parseInt(bcf) > 160) ? '#C44536' : 'rgba(42,24,16,0.08)'}}/>
              {bcf && (parseInt(bcf) < 110 || parseInt(bcf) > 160) && (
                <div style={{fontSize: 10, color: '#C44536', marginTop: 4, fontWeight: 600}}>
                  🚨 BCF anormal (110-160 bpm normal)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2 - SYMPTÔMES / SIGNES DE DANGER */}
        <div style={{...cardStyle, marginTop: 16}}>
          <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 4 }}>2. Signes & symptômes</div>
          <div style={{ fontSize: 12, color: '#8B6F5C', marginBottom: 16 }}>Cocher si la patiente présente l'un de ces signes</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <CheckboxField label="Saignements" checked={symptoms.saignements} onChange={(v) => setSymptoms({...symptoms, saignements: v})}/>
            <CheckboxField label="Céphalées sévères" checked={symptoms.cephalees} onChange={(v) => setSymptoms({...symptoms, cephalees: v})}/>
            <CheckboxField label="Troubles visuels" checked={symptoms.troublesVisuels} onChange={(v) => setSymptoms({...symptoms, troublesVisuels: v})}/>
            <CheckboxField label="Œdèmes" checked={symptoms.oedemes} onChange={(v) => setSymptoms({...symptoms, oedemes: v})}/>
            <CheckboxField label="Fièvre" checked={symptoms.fievre} onChange={(v) => setSymptoms({...symptoms, fievre: v})}/>
            <CheckboxField label="Diminution MAF" checked={symptoms.diminutionMaf} onChange={(v) => setSymptoms({...symptoms, diminutionMaf: v})}/>
          </div>

          {preeclampsiaSigns && (
            <div style={{
              marginTop: 14, padding: 12,
              background: '#C44536', color: '#FAF6F0',
              borderRadius: 10, fontSize: 13, fontWeight: 700
            }}>
              🚨 SUSPICION PRÉ-ÉCLAMPSIE — HTA + symptôme. Référer en urgence vers structure de niveau supérieur.
            </div>
          )}
        </div>

        {/* SECTION 3 - EXAMENS BIOLOGIQUES */}
        <div style={{...cardStyle, marginTop: 16}}>
          <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 4 }}>3. Examens biologiques</div>
          <div style={{ fontSize: 12, color: '#8B6F5C', marginBottom: 16 }}>Cocher les examens réalisés ou prescrits aujourd'hui</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <CheckboxField label="Groupage Rhésus" checked={examsRealized.groupage} onChange={(v) => setExamsRealized({...examsRealized, groupage: v})}/>
            <CheckboxField label="Sérologie VIH" checked={examsRealized.vih} onChange={(v) => setExamsRealized({...examsRealized, vih: v})}/>
            <CheckboxField label="Syphilis (TPHA)" checked={examsRealized.syphilis} onChange={(v) => setExamsRealized({...examsRealized, syphilis: v})}/>
            <CheckboxField label="Hépatite B" checked={examsRealized.hepatiteB} onChange={(v) => setExamsRealized({...examsRealized, hepatiteB: v})}/>
            <CheckboxField label="Toxoplasmose" checked={examsRealized.toxoplasmose} onChange={(v) => setExamsRealized({...examsRealized, toxoplasmose: v})}/>
            <CheckboxField label="Glycémie" checked={examsRealized.glycemie} onChange={(v) => setExamsRealized({...examsRealized, glycemie: v})}/>
            <CheckboxField label="NFS / Hémogramme" checked={examsRealized.nfs} onChange={(v) => setExamsRealized({...examsRealized, nfs: v})}/>
            <CheckboxField label="ECBU" checked={examsRealized.ecbu} onChange={(v) => setExamsRealized({...examsRealized, ecbu: v})}/>
            <CheckboxField label="Albumine/Sucre" checked={examsRealized.albumineSucre} onChange={(v) => setExamsRealized({...examsRealized, albumineSucre: v})}/>
          </div>
        </div>

        {/* SECTION 4 - MÉDICAMENTS */}
        <div style={{...cardStyle, marginTop: 16}}>
          <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 4 }}>4. Médicaments & prophylaxie</div>
          <div style={{ fontSize: 12, color: '#8B6F5C', marginBottom: 16 }}>Médicaments donnés ou prescrits aujourd'hui</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <CheckboxField label="Fer + Acide folique" checked={medications.ferFolate} onChange={(v) => setMedications({...medications, ferFolate: v})}/>
            <CheckboxField label="SP (paludisme)" checked={medications.sp} onChange={(v) => setMedications({...medications, sp: v})}/>
            <CheckboxField label="Calcium" checked={medications.calcium} onChange={(v) => setMedications({...medications, calcium: v})}/>
            <CheckboxField label="VAT (vaccin antitétanique)" checked={medications.vat} onChange={(v) => setMedications({...medications, vat: v})}/>
          </div>
        </div>

        {/* SECTION 5 - OBSERVATIONS LIBRES */}
        <div style={{...cardStyle, marginTop: 16}}>
          <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 16 }}>5. Observations</div>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={4}
            placeholder="Notes cliniques, conseils donnés, plan de soins..."
            style={{...inputStyle, resize: 'vertical', fontFamily: 'inherit'}}
          />
        </div>

        {/* SECTION 6 - PROCHAIN RDV */}
        <div style={{...cardStyle, marginTop: 16}}>
          <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 16 }}>6. Prochain rendez-vous</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>Date prochaine CPN</label>
              <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} style={inputStyle}/>
            </div>
            <div style={{ fontSize: 11, color: '#8B6F5C', padding: 12 }}>
              💡 Suggéré : 28 jours (S{weeks ? weeks + 4 : '—'}). Pour grossesses à risque, raccourcir à 14 jours.
            </div>
          </div>
        </div>

        {/* RÉCAPITULATIF DES ALERTES */}
        {(tensionAlert || dangerSigns || fevreAlert) && (
          <div style={{
            marginTop: 16, padding: 16,
            background: 'linear-gradient(135deg, #FFE8E2 0%, #FAF6F0 100%)',
            border: '2px solid #C44536',
            borderRadius: 14
          }}>
            <div style={{ fontSize: 13, color: '#8B2E26', fontWeight: 700, marginBottom: 8 }}>
              🚨 Cette CPN déclenchera des alertes dans le dossier
            </div>
            <ul style={{ fontSize: 12, color: '#5D4037', margin: 0, paddingLeft: 20 }}>
              {tensionAlertSevere && <li><strong>HTA sévère</strong> — Référence URGENTE recommandée</li>}
              {tensionAlert && !tensionAlertSevere && <li>HTA gravidique modérée — surveillance renforcée</li>}
              {preeclampsiaSigns && <li><strong>Suspicion pré-éclampsie</strong> — bilan + référence</li>}
              {fevreAlert && <li>Fièvre — investiguer cause infectieuse</li>}
              {dangerSigns && <li>Signes de danger déclarés — adapter prise en charge</li>}
            </ul>
            <div style={{ fontSize: 11, color: '#5D4037', marginTop: 8, fontStyle: 'italic' }}>
              Le niveau de risque de la grossesse sera automatiquement mis à jour.
            </div>
          </div>
        )}

        {/* BOUTONS BAS */}
        <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
          <button onClick={() => setView({ name: 'patient', data: patientId })} style={{
            flex: 1, padding: 14, background: '#F5F1EB', color: '#5D4037',
            borderRadius: 14, fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit'
          }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: 14,
            background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)',
            color: '#FAF6F0', borderRadius: 14, fontSize: 14, fontWeight: 700,
            border: 'none', cursor: saving ? 'wait' : 'pointer',
            boxShadow: '0 6px 16px rgba(45,95,93,0.3)', fontFamily: 'inherit',
            opacity: saving ? 0.6 : 1
          }}>{saving ? 'Enregistrement...' : '💾 Valider la CPN'}</button>
        </div>
      </main>
    </div>
  )
}

// =====================================================
// ALERT DETAIL VIEW
// =====================================================
function AlertDetailView({ profile, alertId, setView, openPatientDossier }) {
  const [alert, setAlert] = useState(null)
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { loadAlert() }, [alertId])

  async function loadAlert() {
    setLoading(true)
    const { data } = await supabase.from('alerts')
      .select(`*, woman:profiles!alerts_woman_id_fkey(id, first_name, last_name, ipu, phone, date_of_birth)`)
      .eq('id', alertId).single()
    setAlert(data)
    if (data) {
      const { data: ec } = await supabase.from('emergency_contacts').select('*').eq('woman_id', data.woman_id)
      setContacts(ec || [])
    }
    setLoading(false)
  }

  async function takeOver() {
    setActionLoading(true)
    await supabase.from('alerts').update({ status: 'prise_en_charge', taken_by: profile.id, taken_at: new Date().toISOString() }).eq('id', alertId)
    loadAlert()
    setActionLoading(false)
  }

  async function resolve() {
    if (!confirm('Marquer résolue ?')) return
    setActionLoading(true)
    await supabase.from('alerts').update({ status: 'resolue', resolved_at: new Date().toISOString() }).eq('id', alertId)
    setView({ name: 'home' })
  }

  if (loading) return <LoadingScreen/>
  if (!alert) return <div>Alerte introuvable.</div>

  const minutesAgo = Math.round((new Date() - new Date(alert.created_at)) / 60000)

  return (
    <div style={pageStyle}>
      <header style={{ ...headerStyle, background: alert.status === 'active' ? '#C44536' : '#FFFFFF', color: alert.status === 'active' ? '#FAF6F0' : '#2a1810' }}>
        <button onClick={() => setView({ name: 'home' })} style={{ ...backButtonStyle, background: alert.status === 'active' ? 'rgba(244,228,193,0.2)' : '#F5F1EB', color: alert.status === 'active' ? '#FAF6F0' : '#5D4037' }}>← Retour</button>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>🚨 Alerte SOS</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{alert.status === 'active' ? `Active depuis ${minutesAgo} min` : 'Résolue'}</div>
        </div>
      </header>
      <main style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Patiente</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>{alert.woman?.first_name?.[0]}{alert.woman?.last_name?.[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, serif' }}>{alert.woman?.first_name} {alert.woman?.last_name}</div>
                  <div style={{ fontSize: 12, color: '#8B6F5C', marginTop: 4, fontFamily: 'monospace' }}>{alert.woman?.ipu}</div>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <a href={`tel:${alert.woman?.phone}`} style={{ flex: 1, padding: 14, background: '#2D5F5D', color: '#FAF6F0', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>📞 Appeler</a>
                <button onClick={() => openPatientDossier(alert.woman.id)} style={{ padding: '14px 18px', background: '#F5F1EB', color: '#5D4037', borderRadius: 12, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>📋 Dossier</button>
              </div>
            </div>
            {alert.latitude && (
              <div style={cardStyle}>
                <div style={sectionLabelStyle}>📍 Position GPS</div>
                <div style={{ marginTop: 12, fontSize: 13, fontFamily: 'monospace' }}>{alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}</div>
                <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                  <a href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: 12, background: '#2D5F5D', color: '#FAF6F0', borderRadius: 10, fontSize: 13, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>🗺 Maps</a>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: 12, background: '#C44536', color: '#FAF6F0', borderRadius: 10, fontSize: 13, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>🚗 Itinéraire</a>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: alert.status === 'active' ? 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)' : 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', color: '#FAF6F0', borderRadius: 20, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>Statut</div>
              <div style={{ fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 600, marginTop: 6 }}>{alert.status === 'active' ? 'Active' : alert.status === 'prise_en_charge' ? 'Prise en charge' : 'Résolue'}</div>
            </div>
            {alert.status === 'active' && <button onClick={takeOver} disabled={actionLoading} style={{ padding: 16, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', borderRadius: 14, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>✓ Prendre en charge</button>}
            {alert.status !== 'resolue' && <button onClick={resolve} disabled={actionLoading} style={{ padding: 14, background: '#2D5F5D', color: '#FAF6F0', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Marquer résolue</button>}
          </div>
        </div>
      </main>
    </div>
  )
}

// =====================================================
// COMPOSANTS UTILITAIRES
// =====================================================
function StatCard({ icon, label, value, bg, highlight }) {
  return (
    <div style={{ background: highlight ? 'linear-gradient(135deg, #FFE8E2 0%, #FFFFFF 100%)' : '#FFFFFF', borderRadius: 18, padding: 18, border: highlight ? '2px solid #C44536' : '1px solid rgba(42,24,16,0.04)', animation: highlight && value > 0 ? 'pulse-alert 2s infinite' : 'none' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'Georgia, serif', color: highlight && value > 0 ? '#C44536' : '#2a1810', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#8B6F5C', marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#8B6F5C', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#2a1810', fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{
      padding: '10px 12px', background: checked ? '#FFE8E2' : '#F5F1EB',
      border: checked ? '2px solid #C44536' : '2px solid transparent',
      borderRadius: 10, fontSize: 12, fontWeight: 600,
      color: checked ? '#8B2E26' : '#5D4037', cursor: 'pointer',
      fontFamily: 'inherit', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 8
    }}>
      <span style={{ width: 18, height: 18, borderRadius: 4, background: checked ? '#C44536' : '#FFFFFF', border: checked ? 'none' : '1px solid rgba(42,24,16,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FAF6F0', fontSize: 11 }}>{checked && '✓'}</span>
      {label}
    </button>
  )
}

// =====================================================
// STYLES
// =====================================================
const loadingStyle = { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F1EB', fontFamily: 'system-ui, sans-serif' }
const authBgStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 50%, #0F2A28 100%)', padding: 20, fontFamily: 'system-ui, sans-serif' }
const authCardStyle = { background: '#FAF6F0', borderRadius: 32, padding: '40px 36px', width: '100%', maxWidth: 440, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.4)' }
const logoSmallStyle = { width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FAF6F0', fontSize: 20 }
const labelStyle = { fontSize: 11, color: '#8B6F5C', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }
const inputStyle = { width: '100%', padding: '12px 14px', fontSize: 14, fontWeight: 500, color: '#2a1810', background: '#FFFFFF', border: '2px solid rgba(42,24,16,0.08)', borderRadius: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
const primaryButtonStyle = { width: '100%', padding: 14, background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', color: '#FAF6F0', borderRadius: 14, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 6px 16px rgba(45,95,93,0.3)', fontFamily: 'inherit' }
const linkButtonStyle = { color: '#C44536', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, fontFamily: 'inherit' }
const errorBoxStyle = { marginTop: 14, padding: 12, background: '#FFE8E2', borderRadius: 10, fontSize: 12, color: '#8B2E26', fontWeight: 500 }
const pageStyle = { minHeight: '100vh', background: '#F5F1EB', fontFamily: 'system-ui, sans-serif' }
const headerStyle = { background: '#FFFFFF', borderBottom: '1px solid rgba(42,24,16,0.06)', padding: '14px 32px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }
const avatarStyle = { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }
const searchHeroStyle = { background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', borderRadius: 24, padding: 28, position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px -15px rgba(45,95,93,0.4)' }
const patientRowStyle = { background: '#F5F1EB', border: '1px solid rgba(42,24,16,0.04)', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 14, width: '100%', cursor: 'pointer', fontFamily: 'inherit' }
const cardStyle = { background: '#FFFFFF', borderRadius: 20, padding: 20, border: '1px solid rgba(42,24,16,0.04)' }
const sectionLabelStyle = { fontSize: 11, color: '#8B6F5C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }
const backButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#F5F1EB', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#5D4037', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }

if (typeof document !== 'undefined' && !document.getElementById('yaay-pro-anim')) {
  const style = document.createElement('style')
  style.id = 'yaay-pro-anim'
  style.textContent = `@keyframes pulse-alert { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.02); opacity: 0.95; } }`
  document.head.appendChild(style)
}