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

  if (loading) return <LoadingScreen />
  if (!session) return <AuthScreen />
  if (!profile) return <ProfileSetupScreen userId={session.user.id} email={session.user.email} onComplete={() => loadProfile(session.user.id)} />

  switch (view.name) {
    case 'patient':
      return <PatientFileView profile={profile} patientId={view.data} setView={setView} />
    case 'newCPN':
      return <NewCPNView profile={profile} pregnancyId={view.data.pregnancyId} patientId={view.data.patientId} setView={setView} />
    case 'alert':
      return <AlertDetailView profile={profile} alertId={view.data} setView={setView} />
    default:
      return <DashboardHome profile={profile} setView={setView} />
  }
}

// =====================================================
// LOADING & AUTH (inchangés)
// =====================================================
function LoadingScreen() {
  return (
    <div style={loadingStyle}>
      <div style={{
        width: 60, height: 60, borderRadius: 18,
        background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#FAF6F0', fontSize: 32, marginBottom: 16
      }}>♥</div>
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
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={authBgStyle}>
      <div style={authCardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={logoSmallStyle}>♥</div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Yaay</div>
            <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 600, letterSpacing: '0.05em' }}>
              ESPACE PROFESSIONNEL
            </div>
          </div>
        </div>
        <div style={{ marginTop: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, fontFamily: 'Georgia, serif', lineHeight: 1.2 }}>
            {mode === 'signup' ? "Créer un compte" : "Se connecter"}
            <br/>
            <span style={{ fontStyle: 'italic', color: '#C44536' }}>
              {mode === 'signup' ? "professionnel" : "à Yaay Pro"}
            </span>
          </h1>
        </div>
        <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
          <div>
            <label style={labelStyle}>Email professionnel</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="fatou.ndiaye@yaay.sn" required style={inputStyle}/>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Au moins 6 caractères" required minLength={6} style={inputStyle}/>
          </div>
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
    supabase.from('structures').select('id, name, region').then(({ data }) => {
      if (data) setStructures(data)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.from('profiles').insert({
      id: userId, email, first_name: firstName, last_name: lastName,
      role, phone: '+221' + phone,
      structure_id: structureId || null, preferred_language: 'fr'
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
        <p style={{ fontSize: 13, color: '#5D4037', lineHeight: 1.5, marginBottom: 20 }}>
          Complétez votre profil pour accéder au dashboard.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Prénom</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Nom</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle}/>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Rôle</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
              <option value="sage_femme">Sage-femme</option>
              <option value="medecin">Médecin</option>
              <option value="femme">Patiente</option>
            </select>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Téléphone</label>
            <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', borderRadius: 12, border: '2px solid rgba(42,24,16,0.08)', overflow: 'hidden' }}>
              <span style={{ padding: '12px 14px', fontWeight: 600, borderRight: '1px solid rgba(42,24,16,0.1)' }}>🇸🇳 +221</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="77 654 32 10" required style={{ ...inputStyle, border: 'none' }}/>
            </div>
          </div>
          {(role === 'sage_femme' || role === 'medecin') && (
            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Structure de santé</label>
              <select value={structureId} onChange={(e) => setStructureId(e.target.value)} style={inputStyle}>
                <option value="">— Sélectionnez —</option>
                {structures.map(s => <option key={s.id} value={s.id}>{s.name} ({s.region})</option>)}
              </select>
            </div>
          )}
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
// DASHBOARD HOME - avec système d'alertes
// =====================================================
function DashboardHome({ profile, setView }) {
  const [searchInput, setSearchInput] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [myPatients, setMyPatients] = useState([])
  const [stats, setStats] = useState({ patients: 0, pregnancies: 0, alerts: 0 })
  const [activeAlerts, setActiveAlerts] = useState([])

  useEffect(() => {
    loadMyPatients()
    loadStats()
    loadActiveAlerts()
  }, [])

  // Realtime sur les alertes
  useEffect(() => {
    if (!profile?.id) return
    const channel = supabase
      .channel('pro-alerts-' + profile.id)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => { loadActiveAlerts(); loadStats() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  async function loadActiveAlerts() {
    // Récupérer les UIDs des femmes pour qui j'ai un consentement
    const { data: consents } = await supabase
      .from('consents')
      .select('woman_id')
      .eq('granted_to', profile.id)
      .eq('status', 'accorde')

    if (!consents || consents.length === 0) {
      setActiveAlerts([])
      return
    }

    const womanIds = [...new Set(consents.map(c => c.woman_id))]

    // Récupérer les alertes actives de ces femmes
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*, woman:profiles!alerts_woman_id_fkey(first_name, last_name, ipu, phone)')
      .in('woman_id', womanIds)
      .eq('status', 'active')
      .eq('type', 'sos')
      .order('created_at', { ascending: false })

    setActiveAlerts(alerts || [])
  }

  async function loadMyPatients() {
    const { data } = await supabase
      .from('consents')
      .select(`woman:profiles!consents_woman_id_fkey(
        id, first_name, last_name, ipu, phone,
        pregnancies(id, status, last_period_date, expected_delivery_date, current_risk_level)
      )`)
      .eq('granted_to', profile.id)
      .eq('status', 'accorde')
      .eq('scope', 'lecture_dossier')
      .limit(20)
    if (data) {
      const unique = {}
      data.forEach(c => { if (c.woman) unique[c.woman.id] = c.woman })
      setMyPatients(Object.values(unique))
    }
  }

  async function loadStats() {
    const { data } = await supabase
      .from('consents')
      .select('woman_id')
      .eq('granted_to', profile.id)
      .eq('status', 'accorde')
    const unique = new Set(data?.map(c => c.woman_id) || [])
    const ids = Array.from(unique)
    let pregCount = 0
    if (ids.length > 0) {
      const { count } = await supabase.from('pregnancies').select('*', { count: 'exact', head: true })
        .in('woman_id', ids).eq('status', 'en_cours')
      pregCount = count || 0
    }
    let alertCount = 0
    if (ids.length > 0) {
      const { count } = await supabase.from('alerts').select('*', { count: 'exact', head: true })
        .in('woman_id', ids).eq('status', 'active').eq('type', 'sos')
      alertCount = count || 0
    }
    setStats({ patients: unique.size, pregnancies: pregCount, alerts: alertCount })
  }

  async function handleSearch() {
    const ipu = searchInput.trim().toUpperCase()
    if (ipu.length < 6) return
    setSearchLoading(true)
    setSearchError(null)
    try {
      const { data, error } = await supabase
        .from('profiles').select('id')
        .eq('ipu', ipu).eq('role', 'femme')
        .maybeSingle()
      if (error) throw error
      if (!data) setSearchError(`Aucune patiente trouvée avec l'IPU ${ipu}`)
      else setView({ name: 'patient', data: data.id })
    } catch (err) {
      setSearchError(err.message)
    } finally {
      setSearchLoading(false)
    }
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
            <div style={{ fontSize: 10, color: '#8B6F5C', fontWeight: 600, marginTop: 2 }}>
              {profile.structure?.name || 'Structure non définie'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px 4px 4px', background: '#F5F1EB', borderRadius: 50 }}>
          <div style={avatarStyle}>{profile.first_name?.[0]}{profile.last_name?.[0]}</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.first_name} {profile.last_name}</div>
            <div style={{ fontSize: 10, color: '#8B6F5C' }}>
              {profile.role === 'sage_femme' ? 'Sage-femme' : profile.role === 'medecin' ? 'Médecin' : 'Patiente'}
            </div>
          </div>
          <button onClick={handleLogout} style={{ marginLeft: 8, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#8B6F5C' }}>⏻</button>
        </div>
      </header>

      {/* BANNIÈRE D'ALERTES SOS - TRÈS VISIBLE */}
      {activeAlerts.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)',
          color: '#FAF6F0',
          padding: '14px 32px',
          animation: 'pulse-alert 1.5s infinite'
        }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 28 }}>🚨</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.02em' }}>
                {activeAlerts.length} alerte{activeAlerts.length > 1 ? 's' : ''} SOS active{activeAlerts.length > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                {activeAlerts.map(a => `${a.woman?.first_name} ${a.woman?.last_name}`).join(', ')}
              </div>
            </div>
            <button onClick={() => setView({ name: 'alert', data: activeAlerts[0].id })} style={{
              padding: '10px 20px', background: '#FAF6F0', color: '#8B2E26',
              borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none',
              cursor: 'pointer', fontFamily: 'inherit'
            }}>
              VOIR LA PREMIÈRE →
            </button>
          </div>
        </div>
      )}

      <main style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{today}</div>
          <h1 style={{ fontSize: 36, fontWeight: 600, fontFamily: 'Georgia, serif', marginTop: 4, lineHeight: 1.1 }}>
            Bonjour {profile.first_name},<br/>
            <span style={{ fontStyle: 'italic', color: '#C44536' }}>
              {stats.patients > 0 ? `${stats.patients} patiente${stats.patients > 1 ? 's' : ''} dans votre cohorte` : "aucune patiente pour l'instant"}
            </span>
          </h1>
        </div>

        <div style={searchHeroStyle}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,228,193,0.15) 0%, transparent 70%)' }}/>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, color: 'rgba(244,228,193,0.7)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Consulter une patiente</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#FAF6F0', marginTop: 6, fontFamily: 'Georgia, serif' }}>Saisissez l'IPU de la patiente</div>
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, background: '#FAF6F0', borderRadius: 16, padding: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F4E4C1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔍</div>
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="SN-2026-XXXXXX" style={{ flex: 1, padding: '12px 0', fontSize: 17, fontWeight: 600, color: '#2a1810', background: 'transparent', border: 'none', outline: 'none', letterSpacing: '0.04em', fontFamily: 'inherit' }}/>
              <button onClick={handleSearch} disabled={searchInput.length < 6 || searchLoading} style={{ padding: '12px 24px', background: searchInput.length >= 6 ? 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)' : 'rgba(42,24,16,0.1)', color: searchInput.length >= 6 ? '#FAF6F0' : '#8B6F5C', borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: searchInput.length >= 6 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                {searchLoading ? '...' : 'Ouvrir'}
              </button>
            </div>
          </div>
        </div>

        {searchError && <div style={{ marginTop: 16, padding: 16, background: '#FFE8E2', borderRadius: 14, color: '#8B2E26', fontSize: 13, fontWeight: 600 }}>⚠️ {searchError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 24 }}>
          <StatCard icon="👥" label="Cohorte active" value={stats.patients} color="#C44536" bg="#FFE8E2"/>
          <StatCard icon="🤰" label="Grossesses en cours" value={stats.pregnancies} color="#2D5F5D" bg="#DDEBE9"/>
          <StatCard icon="🚨" label="Alertes SOS actives" value={stats.alerts} color="#C44536" bg="#FFE8E2" highlight={stats.alerts > 0}/>
        </div>

        {/* SECTION ALERTES ACTIVES */}
        {activeAlerts.length > 0 && (
          <div style={{
            marginTop: 24, background: '#FFFFFF', borderRadius: 20,
            padding: 20, border: '2px solid #C44536',
            boxShadow: '0 8px 24px rgba(196,69,54,0.15)'
          }}>
            <div style={{ fontSize: 11, color: '#C44536', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              🚨 Urgent
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 16, color: '#8B2E26' }}>
              Alertes en cours
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeAlerts.map(alert => (
                <button
                  key={alert.id}
                  onClick={() => setView({ name: 'alert', data: alert.id })}
                  style={{
                    background: 'linear-gradient(135deg, #FFE8E2 0%, #FAF6F0 100%)',
                    border: '2px solid #C44536',
                    borderRadius: 14, padding: 16,
                    display: 'flex', alignItems: 'center', gap: 14,
                    width: '100%', cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'left'
                  }}
                >
                  <div style={{
                    width: 50, height: 50, borderRadius: '50%',
                    background: '#C44536', color: '#FAF6F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, animation: 'pulse-alert 1s infinite'
                  }}>🚨</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#2a1810' }}>
                      {alert.woman?.first_name} {alert.woman?.last_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2, fontFamily: 'monospace' }}>
                      {alert.woman?.ipu}
                    </div>
                    <div style={{ fontSize: 11, color: '#8B2E26', marginTop: 4, fontWeight: 600 }}>
                      Alerte SOS · il y a {Math.round((new Date() - new Date(alert.created_at)) / 60000)} min
                    </div>
                  </div>
                  <div style={{ color: '#C44536', fontSize: 18 }}>→</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MES PATIENTES */}
        <div style={{ marginTop: 24, background: '#FFFFFF', borderRadius: 20, padding: 20, border: '1px solid rgba(42,24,16,0.04)' }}>
          <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Ma cohorte</div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 16 }}>Mes patientes</div>
          {myPatients.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#8B6F5C', fontSize: 13 }}>Aucune patiente. Utilisez la recherche IPU.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myPatients.map(p => {
                const preg = p.pregnancies?.find(pr => pr.status === 'en_cours')
                const weeks = preg ? Math.floor((new Date() - new Date(preg.last_period_date)) / (1000 * 60 * 60 * 24 * 7)) : 0
                return (
                  <button key={p.id} onClick={() => setView({ name: 'patient', data: p.id })} style={patientRowStyle}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                      {p.first_name?.[0]}{p.last_name?.[0]}
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#2a1810' }}>{p.first_name} {p.last_name}</div>
                      <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2, display: 'flex', gap: 10 }}>
                        <span style={{ fontFamily: 'monospace' }}>{p.ipu}</span>
                        {preg && <span>· S{weeks}</span>}
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
// ALERT DETAIL VIEW - LE NOUVEAU GROS MORCEAU 🚨
// =====================================================
function AlertDetailView({ profile, alertId, setView }) {
  const [alert, setAlert] = useState(null)
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { loadAlert() }, [alertId])

  async function loadAlert() {
    setLoading(true)
    const { data } = await supabase
      .from('alerts')
      .select(`*,
        woman:profiles!alerts_woman_id_fkey(
          id, first_name, last_name, ipu, phone, date_of_birth,
          pregnancies(id, status, last_period_date, expected_delivery_date, current_risk_level)
        )
      `)
      .eq('id', alertId)
      .single()
    setAlert(data)

    if (data) {
      const { data: ec } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('woman_id', data.woman_id)
      setContacts(ec || [])
    }
    setLoading(false)
  }

  async function takeOver() {
    setActionLoading(true)
    const { error } = await supabase.from('alerts').update({
      status: 'prise_en_charge',
      taken_by: profile.id,
      taken_at: new Date().toISOString()
    }).eq('id', alertId)

    if (error) {
      setError(error.message)
      setActionLoading(false)
    } else {
      loadAlert()
      setActionLoading(false)
    }
  }

  async function resolve() {
    if (!confirm('Marquer cette alerte comme résolue ?')) return
    const notes = prompt('Notes de résolution (optionnel) :') || ''

    setActionLoading(true)
    const { error } = await supabase.from('alerts').update({
      status: 'resolue',
      resolved_at: new Date().toISOString(),
      resolution_notes: notes
    }).eq('id', alertId)

    if (error) {
      setError(error.message)
      setActionLoading(false)
    } else {
      setView({ name: 'home' })
    }
  }

  if (loading) return <LoadingScreen/>
  if (!alert) return <div style={pageStyle}><p style={{padding:40}}>Alerte introuvable.</p></div>

  const minutesAgo = Math.round((new Date() - new Date(alert.created_at)) / 60000)
  const pregnancy = alert.woman?.pregnancies?.find(p => p.status === 'en_cours')
  const weeks = pregnancy ? Math.floor((new Date() - new Date(pregnancy.last_period_date)) / (1000 * 60 * 60 * 24 * 7)) : null
  const age = alert.woman?.date_of_birth ? Math.floor((new Date() - new Date(alert.woman.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25)) : '—'

  return (
    <div style={pageStyle}>
      <header style={{
        ...headerStyle,
        background: alert.status === 'active' ? '#C44536' : '#FFFFFF',
        color: alert.status === 'active' ? '#FAF6F0' : '#2a1810',
        borderBottom: alert.status === 'active' ? 'none' : '1px solid rgba(42,24,16,0.06)'
      }}>
        <button onClick={() => setView({ name: 'home' })} style={{
          ...backButtonStyle,
          background: alert.status === 'active' ? 'rgba(244,228,193,0.2)' : '#F5F1EB',
          color: alert.status === 'active' ? '#FAF6F0' : '#5D4037'
        }}>← Retour</button>
        <div style={{ flex: 1, marginLeft: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 28, animation: alert.status === 'active' ? 'pulse-alert 1s infinite' : 'none' }}>🚨</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
              Alerte SOS
            </div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
              {alert.status === 'active' ? `Active depuis ${minutesAgo} min` :
               alert.status === 'prise_en_charge' ? 'Prise en charge' :
               'Résolue'}
            </div>
          </div>
        </div>
      </header>

      <main style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {error && <div style={{ marginBottom: 16, padding: 14, background: '#FFE8E2', borderRadius: 12, color: '#8B2E26' }}>⚠️ {error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* COLONNE PRINCIPALE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Patiente */}
            <div style={cardStyle}>
              <div style={sectionLabelStyle}>Patiente</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 18,
                  background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)',
                  color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 700
                }}>
                  {alert.woman?.first_name?.[0]}{alert.woman?.last_name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
                    {alert.woman?.first_name} {alert.woman?.last_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#8B6F5C', marginTop: 4, fontFamily: 'monospace' }}>{alert.woman?.ipu}</div>
                  <div style={{ fontSize: 13, color: '#5D4037', marginTop: 4 }}>
                    {age} ans {pregnancy && `· S${weeks} · Risque ${pregnancy.current_risk_level || 'faible'}`}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <a href={`tel:${alert.woman?.phone}`} style={{
                  flex: 1, padding: 14, background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)',
                  color: '#FAF6F0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                  textDecoration: 'none', textAlign: 'center'
                }}>
                  📞 Appeler {alert.woman?.phone}
                </a>
                <button onClick={() => setView({ name: 'patient', data: alert.woman.id })} style={{
                  padding: '14px 18px', background: '#F5F1EB', color: '#5D4037',
                  borderRadius: 12, fontSize: 13, fontWeight: 600,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  📋 Dossier
                </button>
              </div>
            </div>

            {/* Position GPS */}
            {alert.latitude && alert.longitude && (
              <div style={cardStyle}>
                <div style={sectionLabelStyle}>📍 Position GPS de la patiente</div>
                <div style={{ marginTop: 12, padding: 14, background: '#F5F1EB', borderRadius: 12 }}>
                  <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>
                    {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                  </div>
                  <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 4 }}>
                    Précision : ±{Math.round(alert.gps_accuracy || 0)}m
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                  <a href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                     target="_blank" rel="noopener noreferrer"
                     style={{
                       flex: 1, padding: 12, background: '#2D5F5D', color: '#FAF6F0',
                       borderRadius: 10, fontSize: 13, fontWeight: 600,
                       textAlign: 'center', textDecoration: 'none'
                     }}>
                    🗺 Voir sur Google Maps
                  </a>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`}
                     target="_blank" rel="noopener noreferrer"
                     style={{
                       flex: 1, padding: 12, background: '#C44536', color: '#FAF6F0',
                       borderRadius: 10, fontSize: 13, fontWeight: 600,
                       textAlign: 'center', textDecoration: 'none'
                     }}>
                    🚗 Itinéraire
                  </a>
                </div>
              </div>
            )}

            {/* Contacts d'urgence */}
            {contacts.length > 0 && (
              <div style={cardStyle}>
                <div style={sectionLabelStyle}>Contacts d'urgence de la patiente</div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {contacts.map(c => (
                    <div key={c.id} style={{
                      background: '#F5F1EB', borderRadius: 12, padding: 12,
                      display: 'flex', alignItems: 'center', gap: 12
                    }}>
                      <div style={{ fontSize: 22 }}>👤</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#2a1810' }}>
                          {c.full_name}
                        </div>
                        <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2 }}>
                          {c.relationship} · {c.phone}
                        </div>
                      </div>
                      <a href={`tel:${c.phone}`} style={{
                        padding: '8px 14px', background: '#2D5F5D', color: '#FAF6F0',
                        borderRadius: 10, fontSize: 12, fontWeight: 700,
                        textDecoration: 'none'
                      }}>
                        📞 Appeler
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* COLONNE LATÉRALE - ACTIONS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Statut */}
            <div style={{
              background: alert.status === 'active' ? 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)' :
                          alert.status === 'prise_en_charge' ? 'linear-gradient(135deg, #D4A574 0%, #8B6F5C 100%)' :
                          'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)',
              color: '#FAF6F0', borderRadius: 20, padding: 20
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>
                Statut
              </div>
              <div style={{ fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 600, marginTop: 6 }}>
                {alert.status === 'active' ? 'Active' :
                 alert.status === 'prise_en_charge' ? 'Prise en charge' :
                 'Résolue'}
              </div>
              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4 }}>
                {alert.status === 'active' && `Reçue il y a ${minutesAgo} min`}
                {alert.status === 'prise_en_charge' && alert.taken_at && `Prise en charge à ${new Date(alert.taken_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}`}
                {alert.status === 'resolue' && alert.resolved_at && `Résolue à ${new Date(alert.resolved_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}`}
              </div>
            </div>

            {/* Actions */}
            {alert.status === 'active' && (
              <button onClick={takeOver} disabled={actionLoading} style={{
                padding: 16, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)',
                color: '#FAF6F0', borderRadius: 14, fontSize: 14, fontWeight: 700,
                border: 'none', cursor: actionLoading ? 'wait' : 'pointer',
                fontFamily: 'inherit', boxShadow: '0 6px 16px rgba(196,69,54,0.3)',
                opacity: actionLoading ? 0.6 : 1
              }}>
                {actionLoading ? '...' : '✓ Prendre en charge'}
              </button>
            )}

            {alert.status !== 'resolue' && (
              <button onClick={resolve} disabled={actionLoading} style={{
                padding: 14, background: '#2D5F5D', color: '#FAF6F0',
                borderRadius: 12, fontSize: 13, fontWeight: 700,
                border: 'none', cursor: actionLoading ? 'wait' : 'pointer',
                fontFamily: 'inherit', opacity: actionLoading ? 0.6 : 1
              }}>
                Marquer comme résolue
              </button>
            )}

            {/* Info */}
            <div style={{ ...cardStyle, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                Notifications envoyées
              </div>
              <div style={{ fontSize: 12, color: '#5D4037', lineHeight: 1.6 }}>
                {alert.husband_notified && <div>✓ Famille (contacts)</div>}
                {alert.midwife_notified && <div>✓ Sage-femme</div>}
                {alert.ambulance_notified ? <div>✓ Ambulance</div> : <div style={{color: '#8B6F5C', fontStyle: 'italic'}}>○ Ambulance non contactée</div>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// =====================================================
// PATIENT FILE VIEW (déjà existant, simplifié)
// =====================================================
function PatientFileView({ profile, patientId, setView }) {
  const [patient, setPatient] = useState(null)
  const [pregnancy, setPregnancy] = useState(null)
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPatient() }, [patientId])

  async function loadPatient() {
    setLoading(true)
    const { data: p } = await supabase.from('profiles').select('*').eq('id', patientId).single()
    setPatient(p)

    const { data: preg } = await supabase
      .from('pregnancies').select('*')
      .eq('woman_id', patientId).eq('status', 'en_cours')
      .maybeSingle()
    setPregnancy(preg)

    if (preg) {
      const { data: cpns } = await supabase
        .from('consultations')
        .select('*, performed_by_profile:profiles!consultations_performed_by_fkey(first_name, last_name)')
        .eq('pregnancy_id', preg.id)
        .order('consultation_date', { ascending: false })
      setConsultations(cpns || [])
    }
    setLoading(false)
  }

  if (loading) return <LoadingScreen />
  if (!patient) return <div>Patiente introuvable.</div>

  const weeks = pregnancy ? Math.floor((new Date() - new Date(pregnancy.last_period_date)) / (1000 * 60 * 60 * 24 * 7)) : null
  const age = patient.date_of_birth ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25)) : '—'

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView({ name: 'home' })} style={backButtonStyle}>← Retour</button>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>{patient.first_name} {patient.last_name}</div>
          <div style={{ fontSize: 11, color: '#8B6F5C' }}>{patient.ipu} · {age} ans {pregnancy && `· S${weeks}`}</div>
        </div>
        {pregnancy && (
          <button onClick={() => setView({ name: 'newCPN', data: { pregnancyId: pregnancy.id, patientId } })} style={{
            padding: '12px 18px', background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)',
            color: '#FAF6F0', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit'
          }}>➕ Nouvelle CPN</button>
        )}
      </header>
      <main style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ ...cardStyle }}>
          <div style={sectionLabelStyle}>Historique CPN</div>
          {consultations.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#8B6F5C' }}>Aucune CPN. Cliquez sur "Nouvelle CPN" pour saisir.</div>
          ) : (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {consultations.map(c => (
                <div key={c.id} style={{ background: '#F5F1EB', borderRadius: 12, padding: 14, display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr) 1fr', gap: 12, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{new Date(c.consultation_date).toLocaleDateString('fr-FR')}</div>
                    <div style={{ fontSize: 10, color: '#8B6F5C' }}>S{c.gestational_age_weeks || '—'}</div>
                  </div>
                  <div style={{ fontSize: 12 }}>Poids: <strong>{c.weight_kg || '—'}</strong></div>
                  <div style={{ fontSize: 12 }}>TA: <strong>{c.blood_pressure_systolic && c.blood_pressure_diastolic ? `${c.blood_pressure_systolic}/${c.blood_pressure_diastolic}` : '—'}</strong></div>
                  <div style={{ fontSize: 12 }}>HU: <strong>{c.uterine_height_cm || '—'}</strong></div>
                  <div style={{ fontSize: 12 }}>BCF: <strong>{c.fetal_heart_rate || '—'}</strong></div>
                  <div style={{ fontSize: 11, color: '#8B6F5C', textAlign: 'right' }}>par {c.performed_by_profile?.first_name?.[0] || '—'}. {c.performed_by_profile?.last_name || ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// =====================================================
// NEW CPN VIEW
// =====================================================
function NewCPNView({ profile, pregnancyId, patientId, setView }) {
  const [pregnancy, setPregnancy] = useState(null)
  const [patient, setPatient] = useState(null)
  const [lastCPN, setLastCPN] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [weight, setWeight] = useState('')
  const [bpSys, setBpSys] = useState('')
  const [bpDia, setBpDia] = useState('')
  const [uh, setUh] = useState('')
  const [bcf, setBcf] = useState('')
  const [observations, setObservations] = useState('')
  const [nextDate, setNextDate] = useState('')

  useEffect(() => { loadData() }, [pregnancyId])

  async function loadData() {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', patientId).single()
    setPatient(p)
    const { data: preg } = await supabase.from('pregnancies').select('*').eq('id', pregnancyId).single()
    setPregnancy(preg)
    const { data: cpns } = await supabase.from('consultations').select('*').eq('pregnancy_id', pregnancyId).order('consultation_date', { ascending: false }).limit(1)
    if (cpns && cpns.length > 0) {
      setLastCPN(cpns[0])
      if (cpns[0].weight_kg) setWeight(cpns[0].weight_kg.toString())
      if (cpns[0].blood_pressure_systolic) setBpSys(cpns[0].blood_pressure_systolic.toString())
      if (cpns[0].blood_pressure_diastolic) setBpDia(cpns[0].blood_pressure_diastolic.toString())
    }
    const next = new Date()
    next.setDate(next.getDate() + 28)
    setNextDate(next.toISOString().split('T')[0])
    setLoading(false)
  }

  const tensionAlert = (parseInt(bpSys) >= 14 || parseInt(bpDia) >= 9) && bpSys && bpDia
  const isHighRisk = tensionAlert

  async function handleSave() {
    setSaving(true)
    setError(null)
    const weeks = pregnancy ? Math.floor((new Date() - new Date(pregnancy.last_period_date)) / (1000 * 60 * 60 * 24 * 7)) : null
    try {
      const { error: insertError } = await supabase.from('consultations').insert({
        pregnancy_id: pregnancyId, performed_by: profile.id, structure_id: profile.structure_id,
        consultation_date: new Date().toISOString(), gestational_age_weeks: weeks,
        weight_kg: weight ? parseFloat(weight) : null,
        blood_pressure_systolic: bpSys ? parseInt(bpSys) : null,
        blood_pressure_diastolic: bpDia ? parseInt(bpDia) : null,
        uterine_height_cm: uh ? parseFloat(uh) : null,
        fetal_heart_rate: bcf ? parseInt(bcf) : null,
        observations: observations || null,
        next_appointment_date: nextDate || null,
        validated: true, validated_at: new Date().toISOString()
      })
      if (insertError) throw insertError
      if (isHighRisk) {
        await supabase.from('pregnancies').update({ current_risk_level: 'eleve' }).eq('id', pregnancyId)
      }
      if (nextDate) {
        await supabase.from('appointments').insert({
          pregnancy_id: pregnancyId, structure_id: profile.structure_id,
          appointment_date: new Date(nextDate).toISOString(), type: 'cpn', status: 'planifie'
        })
      }
      setView({ name: 'patient', data: patientId })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) return <LoadingScreen/>

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView({ name: 'patient', data: patientId })} style={backButtonStyle}>✕ Annuler</button>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Nouvelle CPN · {patient?.first_name} {patient?.last_name}</div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '12px 20px', background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)',
          color: '#FAF6F0', borderRadius: 12, fontSize: 13, fontWeight: 700,
          border: 'none', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit',
          opacity: saving ? 0.6 : 1
        }}>
          {saving ? 'Enregistrement...' : '💾 Valider'}
        </button>
      </header>
      <main style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
        {error && <div style={{ padding: 14, background: '#FFE8E2', borderRadius: 12, color: '#8B2E26', marginBottom: 16 }}>⚠️ {error}</div>}
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif', marginBottom: 20 }}>Constantes du jour</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Poids (kg)</label>
              <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Tension</label>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                <input type="number" value={bpSys} onChange={(e) => setBpSys(e.target.value)} placeholder="11" style={{...inputStyle, textAlign: 'center', borderColor: tensionAlert ? '#C44536' : 'rgba(42,24,16,0.08)'}}/>
                <span style={{padding: 12, fontSize: 17, fontWeight: 700}}>/</span>
                <input type="number" value={bpDia} onChange={(e) => setBpDia(e.target.value)} placeholder="7" style={{...inputStyle, textAlign: 'center', borderColor: tensionAlert ? '#C44536' : 'rgba(42,24,16,0.08)'}}/>
              </div>
              {tensionAlert && <div style={{fontSize: 10, color: '#8B2E26', marginTop: 4, fontWeight: 600}}>⚠ HTA gravidique</div>}
            </div>
            <div>
              <label style={labelStyle}>Hauteur utérine (cm)</label>
              <input type="number" value={uh} onChange={(e) => setUh(e.target.value)} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>BCF (bpm)</label>
              <input type="number" value={bcf} onChange={(e) => setBcf(e.target.value)} style={inputStyle}/>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={labelStyle}>Observations</label>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={4} style={{...inputStyle, resize: 'vertical'}}/>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Prochain RDV</label>
            <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} style={inputStyle}/>
          </div>
        </div>
      </main>
    </div>
  )
}

// =====================================================
// COMPOSANTS UTILITAIRES
// =====================================================
function StatCard({ icon, label, value, color, bg, highlight }) {
  return (
    <div style={{
      background: highlight ? 'linear-gradient(135deg, #FFE8E2 0%, #FFFFFF 100%)' : '#FFFFFF',
      borderRadius: 18, padding: 18,
      border: highlight ? '2px solid #C44536' : '1px solid rgba(42,24,16,0.04)',
      animation: highlight && value > 0 ? 'pulse-alert 2s infinite' : 'none'
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'Georgia, serif', color: highlight && value > 0 ? '#C44536' : '#2a1810', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#8B6F5C', marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// =====================================================
// STYLES + ANIMATIONS
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

// Animations
if (typeof document !== 'undefined' && !document.getElementById('yaay-pro-animations')) {
  const style = document.createElement('style')
  style.id = 'yaay-pro-animations'
  style.textContent = `
    @keyframes pulse-alert {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.02); opacity: 0.95; }
    }
  `
  document.head.appendChild(style)
}