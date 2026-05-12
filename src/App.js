// =====================================================
// YAAY PRO - APP.JS PARTIE 1/2
// Auth + Dashboard + Création/Modification patiente
// À CONCATÉNER avec yaay_pro_part2.jsx
// =====================================================

import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { calculateRiskScore, getRiskRecommendation, extractRiskDataFromPregnancy } from './riskScore'

// =====================================================
// MAIN APP
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
    const { data } = await supabase.from('profiles').select('*, structure:structures(name, region, district)').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  async function openPatientDossier(patientId) {
    if (!profile) return
    const { data: consent } = await supabase.from('consents').select('id').eq('woman_id', patientId).eq('granted_to', profile.id).eq('scope', 'lecture_dossier').eq('status', 'accorde').maybeSingle()
    if (consent) setView({ name: 'patient', data: patientId })
    else setView({ name: 'requestConsent', data: patientId })
  }

  if (loading) return <LoadingScreen />
  if (!session) return <AuthScreen />
  if (!profile) return <ProfileSetupScreen userId={session.user.id} email={session.user.email} onComplete={() => loadProfile(session.user.id)} />

  // ⚠️ Les vues 'patient', 'newCPN', 'newPregnancy', 'alert' sont dans PARTIE 2
  switch (view.name) {
    case 'patient': return <PatientFileView profile={profile} patientId={view.data} setView={setView} />
    case 'editPatient': return <EditPatientView profile={profile} patientId={view.data} setView={setView} />
    case 'newCPN': return <NewCPNView profile={profile} pregnancyId={view.data.pregnancyId} patientId={view.data.patientId} setView={setView} />
    case 'newPregnancy': return <NewPregnancyView profile={profile} patientId={view.data} setView={setView} />
    case 'alert': return <AlertDetailView profile={profile} alertId={view.data} setView={setView} openPatientDossier={openPatientDossier} />
    case 'enrollPatient': return <EnrollPatientView profile={profile} setView={setView} openPatientDossier={openPatientDossier} />
    case 'requestConsent': return <RequestConsentScreen profile={profile} patientId={view.data} setView={setView} />
    default: return <DashboardHome profile={profile} setView={setView} openPatientDossier={openPatientDossier} />
  }
}

function LoadingScreen() {
  return (
    <div style={loadingStyle}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FAF6F0', fontSize: 32, marginBottom: 16 }}>♥</div>
      <div style={{ fontSize: 32, fontFamily: 'Georgia, serif', fontWeight: 600 }}>Yaay</div>
    </div>
  )
}

// =====================================================
// AUTH SCREEN
// =====================================================
function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError(null)
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
            <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 600 }}>ESPACE PROFESSIONNEL</div>
          </div>
        </div>
        <h1 style={{ fontSize: 28, fontFamily: 'Georgia, serif', marginTop: 32, lineHeight: 1.2 }}>
          {mode === 'signup' ? 'Créer un compte' : 'Se connecter'}<br/>
          <span style={{ fontStyle: 'italic', color: '#C44536' }}>{mode === 'signup' ? 'professionnel' : 'à Yaay Pro'}</span>
        </h1>
        <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
          <div><label style={labelStyle}>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle}/></div>
          <div style={{ marginTop: 16 }}><label style={labelStyle}>Mot de passe</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={inputStyle}/></div>
          {error && <div style={errorBoxStyle}>⚠️ {error}</div>}
          <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, marginTop: 24, opacity: loading ? 0.6 : 1 }}>{loading ? '...' : (mode === 'signup' ? 'Créer mon compte' : 'Se connecter')}</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13 }}>
          {mode === 'signup' ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
          <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null) }} style={linkButtonStyle}>{mode === 'signup' ? 'Se connecter' : 'Créer un compte'}</button>
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
  useEffect(() => { supabase.from('structures').select('id, name, region').then(({ data }) => { if (data) setStructures(data) }) }, [])
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError(null)
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
          <h1 style={{ fontSize: 22, fontFamily: 'Georgia, serif' }}>Bienvenue dans Yaay Pro</h1>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Prénom</label><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle}/></div>
            <div><label style={labelStyle}>Nom</label><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle}/></div>
          </div>
          <div style={{ marginTop: 16 }}><label style={labelStyle}>Rôle</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
              <option value="sage_femme">Sage-femme</option><option value="medecin">Médecin</option>
            </select>
          </div>
          <div style={{ marginTop: 16 }}><label style={labelStyle}>Téléphone</label>
            <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', borderRadius: 12, border: '2px solid rgba(42,24,16,0.08)', overflow: 'hidden' }}>
              <span style={{ padding: '12px 14px', fontWeight: 600, borderRight: '1px solid rgba(42,24,16,0.1)' }}>🇸🇳 +221</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="77 654 32 10" required style={{ ...inputStyle, border: 'none' }}/>
            </div>
          </div>
          <div style={{ marginTop: 16 }}><label style={labelStyle}>Structure</label>
            <select value={structureId} onChange={(e) => setStructureId(e.target.value)} style={inputStyle}>
              <option value="">— Sélectionnez —</option>
              {structures.map(s => <option key={s.id} value={s.id}>{s.name} ({s.region})</option>)}
            </select>
          </div>
          {error && <div style={errorBoxStyle}>⚠️ {error}</div>}
          <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, marginTop: 24, opacity: loading ? 0.6 : 1 }}>{loading ? '...' : 'Valider mon profil'}</button>
        </form>
      </div>
    </div>
  )
}

// =====================================================
// REQUEST CONSENT
// =====================================================
function RequestConsentScreen({ profile, patientId, setView }) {
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => {
    supabase.from('profiles').select('id, first_name, last_name, ipu, phone, city').eq('id', patientId).single().then(({ data }) => { setPatient(data); setLoading(false) })
  }, [patientId])
  async function sendRequest() {
    setSending(true); setError(null)
    try {
      const { error: e } = await supabase.from('consent_requests').insert({
        woman_id: patientId, requested_by: profile.id, scope: 'lecture_dossier',
        message: `${profile.first_name} ${profile.last_name} demande l'accès à votre dossier.`
      })
      if (e) throw e
      setSuccess(true); setSending(false)
    } catch (err) { setError(err.message); setSending(false) }
  }
  if (loading) return <LoadingScreen/>
  if (!patient) return <div>Patiente introuvable.</div>
  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView({ name: 'home' })} style={backButtonStyle}>← Retour</button>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Demander un consentement</div>
        </div>
      </header>
      <main style={{ padding: '24px 32px', maxWidth: 720, margin: '0 auto' }}>
        <div style={cardStyle}>
          <div style={sectionLabelStyle}>Patiente</div>
          <div style={{ marginTop: 12, fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 700 }}>{patient.first_name} {patient.last_name}</div>
          <div style={{ fontSize: 12, color: '#8B6F5C', fontFamily: 'monospace' }}>{patient.ipu}</div>
        </div>
        {success ? (
          <div style={{ ...cardStyle, marginTop: 16, textAlign: 'center', padding: 32 }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#2D5F5D', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto', marginBottom: 16 }}>📨</div>
            <h2 style={{ fontSize: 22, fontFamily: 'Georgia, serif' }}>Demande envoyée !</h2>
            <button onClick={() => setView({ name: 'home' })} style={{ ...primaryButtonStyle, marginTop: 24, maxWidth: 300 }}>Retour</button>
          </div>
        ) : (
          <>
            {error && <div style={{ marginTop: 14, padding: 12, background: '#FFE8E2', borderRadius: 10, color: '#8B2E26' }}>⚠️ {error}</div>}
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button onClick={() => setView({ name: 'home' })} style={{ flex: 1, padding: 14, background: '#F5F1EB', color: '#5D4037', borderRadius: 14, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
              <button onClick={sendRequest} disabled={sending} style={{ flex: 2, ...primaryButtonStyle }}>{sending ? '...' : '📨 Envoyer la demande'}</button>
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
  const [searchError, setSearchError] = useState(null)
  const [myPatients, setMyPatients] = useState([])
  const [stats, setStats] = useState({ patients: 0, pregnancies: 0, alerts: 0, highRisk: 0 })
  const [activeAlerts, setActiveAlerts] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  async function loadAll() {
    if (!profile?.id) return
    const { data: consents } = await supabase.from('consents').select('woman_id').eq('granted_to', profile.id).eq('status', 'accorde').eq('scope', 'lecture_dossier')
    const uniqueIds = consents ? [...new Set(consents.map(c => c.woman_id))] : []
    if (uniqueIds.length === 0) {
      setMyPatients([]); setStats({ patients: 0, pregnancies: 0, alerts: 0, highRisk: 0 }); setActiveAlerts([]); return
    }
    const { data: patients } = await supabase.from('profiles').select('id, first_name, last_name, ipu, phone').in('id', uniqueIds)
    const { data: pregnancies } = await supabase.from('pregnancies').select('id, woman_id, status, last_period_date, expected_delivery_date, current_risk_level').in('woman_id', uniqueIds)
    const patientsWithPregs = (patients || []).map(p => ({ ...p, pregnancies: (pregnancies || []).filter(pr => pr.woman_id === p.id) }))
    setMyPatients(patientsWithPregs)
    const pregCount = (pregnancies || []).filter(p => p.status === 'en_cours').length
    const highRiskCount = (pregnancies || []).filter(p => p.status === 'en_cours' && ['eleve', 'tres_eleve'].includes(p.current_risk_level)).length
    const { data: alerts } = await supabase.from('alerts').select('id, woman_id, type, status, created_at, latitude, longitude').in('woman_id', uniqueIds).eq('status', 'active').eq('type', 'sos').order('created_at', { ascending: false })
    const alertsWithNames = (alerts || []).map(a => ({ ...a, woman: patientsWithPregs.find(p => p.id === a.woman_id) }))
    setActiveAlerts(alertsWithNames)
    setStats({ patients: uniqueIds.length, pregnancies: pregCount, alerts: alertsWithNames.length, highRisk: highRiskCount })
  }

  useEffect(() => { loadAll() }, [profile?.id, refreshKey])
  useEffect(() => {
    if (!profile?.id) return
    const pollInterval = setInterval(() => loadAll(), 8000)
    const channel = supabase.channel('pro-dashboard-' + profile.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consents' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consent_requests' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pregnancies' }, () => loadAll())
      .subscribe()
    return () => { clearInterval(pollInterval); supabase.removeChannel(channel) }
  }, [profile?.id])

  async function handleSearch() {
    const ipu = searchInput.trim().toUpperCase()
    if (ipu.length < 6) return
    setSearchError(null)
    const { data } = await supabase.from('profiles').select('id').eq('ipu', ipu).eq('role', 'femme').maybeSingle()
    if (!data) setSearchError(`Aucune patiente trouvée avec l'IPU ${ipu}`)
    else openPatientDossier(data.id)
  }
  async function handleLogout() { await supabase.auth.signOut() }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={logoSmallStyle}>♥</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Yaay <span style={{ fontStyle: 'italic', color: '#8B6F5C', fontWeight: 400 }}>Pro</span></div>
            <div style={{ fontSize: 10, color: '#8B6F5C' }}>{profile.structure?.name || 'Structure'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setRefreshKey(k => k + 1)} style={{ padding: 8, background: '#F5F1EB', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 16 }}>🔄</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px 4px 4px', background: '#F5F1EB', borderRadius: 50 }}>
            <div style={avatarStyle}>{profile.first_name?.[0]}{profile.last_name?.[0]}</div>
            <div><div style={{ fontSize: 13, fontWeight: 600 }}>{profile.first_name} {profile.last_name}</div></div>
            <button onClick={handleLogout} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#8B6F5C' }}>⏻</button>
          </div>
        </div>
      </header>

      {activeAlerts.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', padding: '14px 32px', animation: 'pulse-alert 1.5s infinite' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 28 }}>🚨</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{activeAlerts.length} alerte{activeAlerts.length > 1 ? 's' : ''} SOS</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>{activeAlerts.map(a => `${a.woman?.first_name} ${a.woman?.last_name}`).join(', ')}</div>
            </div>
            <button onClick={() => setView({ name: 'alert', data: activeAlerts[0].id })} style={{ padding: '10px 20px', background: '#FAF6F0', color: '#8B2E26', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>VOIR →</button>
          </div>
        </div>
      )}

      <main style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <h1 style={{ fontSize: 32, fontFamily: 'Georgia, serif', lineHeight: 1.1 }}>
            Bonjour {profile.first_name},<br/>
            <span style={{ fontStyle: 'italic', color: '#C44536' }}>{stats.patients > 0 ? `${stats.patients} patiente${stats.patients > 1 ? 's' : ''}` : 'aucune patiente'}</span>
          </h1>
          <button onClick={() => setView({ name: 'enrollPatient' })} style={{ padding: '14px 22px', background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', borderRadius: 14, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Nouvelle patiente</button>
        </div>

        <div style={searchHeroStyle}>
          <div style={{ fontSize: 11, color: 'rgba(244,228,193,0.7)', fontWeight: 700, textTransform: 'uppercase' }}>Consulter une patiente</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#FAF6F0', marginTop: 6, fontFamily: 'Georgia, serif' }}>Saisissez l'IPU</div>
          <div style={{ marginTop: 20, display: 'flex', gap: 8, background: '#FAF6F0', borderRadius: 16, padding: 6 }}>
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="SN-2026-XXXXXX" style={{ flex: 1, padding: '12px 14px', fontSize: 17, fontWeight: 600, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit' }}/>
            <button onClick={handleSearch} disabled={searchInput.length < 6} style={{ padding: '12px 24px', background: searchInput.length >= 6 ? 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)' : 'rgba(42,24,16,0.1)', color: searchInput.length >= 6 ? '#FAF6F0' : '#8B6F5C', borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: searchInput.length >= 6 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>Ouvrir</button>
          </div>
        </div>

        {searchError && <div style={{ marginTop: 16, padding: 16, background: '#FFE8E2', borderRadius: 14, color: '#8B2E26' }}>⚠️ {searchError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 24 }}>
          <StatCard icon="👥" label="Cohorte" value={stats.patients} bg="#FFE8E2"/>
          <StatCard icon="🤰" label="Grossesses" value={stats.pregnancies} bg="#DDEBE9"/>
          <StatCard icon="🤖" label="Risque élevé (IA)" value={stats.highRisk} bg="#F4E4C1" highlight={stats.highRisk > 0}/>
          <StatCard icon="🚨" label="Alertes SOS" value={stats.alerts} bg="#FFE8E2" highlight={stats.alerts > 0}/>
        </div>

        <div style={{ marginTop: 24, background: '#FFFFFF', borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 20, fontFamily: 'Georgia, serif', fontWeight: 600, marginBottom: 16 }}>Mes patientes</div>
          {myPatients.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#8B6F5C' }}>Aucune patiente. Cliquez "+ Nouvelle patiente".</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myPatients.map(p => {
                const preg = p.pregnancies?.find(pr => pr.status === 'en_cours')
                const weeks = preg ? Math.floor((new Date() - new Date(preg.last_period_date)) / (1000 * 60 * 60 * 24 * 7)) : 0
                const risk = preg?.current_risk_level
                const riskColor = risk === 'tres_eleve' ? '#C44536' : risk === 'eleve' ? '#D4A574' : risk === 'modere' ? '#8B6F5C' : '#2D5F5D'
                return (
                  <button key={p.id} onClick={() => openPatientDossier(p.id)} style={patientRowStyle}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{p.first_name?.[0]}{p.last_name?.[0]}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{p.first_name} {p.last_name}</div>
                      <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2, display: 'flex', gap: 10 }}>
                        <span style={{ fontFamily: 'monospace' }}>{p.ipu}</span>
                        {preg && <span>· S{weeks}</span>}
                        {preg && risk && <span style={{ color: riskColor, fontWeight: 700 }}>· {risk}</span>}
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

function StatCard({ icon, label, value, bg, highlight }) {
  return (
    <div style={{ background: bg, borderRadius: 16, padding: 16, border: highlight ? '2px solid #C44536' : 'none' }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 10, color: '#8B6F5C', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  )
}

// =====================================================
// ENROLL PATIENT
// =====================================================
function EnrollPatientView({ profile, setView, openPatientDossier }) {
  const [tab, setTab] = useState('create')
  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView({ name: 'home' })} style={backButtonStyle}>← Retour</button>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>Enrôler une patiente</div>
        </div>
      </header>
      <main style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(42,24,16,0.08)', marginBottom: 24 }}>
          {[{ id: 'create', label: '📝 Créer' }, { id: 'existing', label: '🔍 Par IPU' }, { id: 'search', label: '👥 Rechercher' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600, color: tab === t.id ? '#C44536' : '#8B6F5C', borderBottom: tab === t.id ? '2px solid #C44536' : '2px solid transparent', marginBottom: -1, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{t.label}</button>
          ))}
        </div>
        {tab === 'create' && <PatientForm profile={profile} setView={setView} mode="create"/>}
        {tab === 'existing' && <RequestExistingPatientForm openPatientDossier={openPatientDossier}/>}
        {tab === 'search' && <SearchExistingPatientForm openPatientDossier={openPatientDossier}/>}
      </main>
    </div>
  )
}

// =====================================================
// EDIT PATIENT - NOUVEAU - Modifier une patiente existante
// =====================================================
function EditPatientView({ profile, patientId, setView }) {
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState(null)
  const [pregnancy, setPregnancy] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', patientId).single()
      const { data: preg } = await supabase.from('pregnancies').select('*').eq('woman_id', patientId).eq('status', 'en_cours').maybeSingle()
      setPatient(p); setPregnancy(preg); setLoading(false)
    }
    load()
  }, [patientId])

  if (loading) return <LoadingScreen/>
  if (!patient) return <div>Patiente introuvable</div>

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView({ name: 'patient', data: patientId })} style={backButtonStyle}>← Retour</button>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>✏️ Modifier les informations</div>
          <div style={{ fontSize: 12, color: '#8B6F5C', marginTop: 2 }}>{patient.first_name} {patient.last_name} · {patient.ipu}</div>
        </div>
      </header>
      <main style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 16, padding: 14, background: '#FFF6E8', border: '1px solid #D4A574', borderRadius: 12, fontSize: 12, color: '#5D4037', lineHeight: 1.5 }}>
          ⚠️ <strong>Mode édition</strong> : vous modifiez les informations de la patiente. Vos changements seront sauvegardés et le score IA sera recalculé.
        </div>
        <PatientForm profile={profile} setView={setView} mode="edit" existingPatient={patient} existingPregnancy={pregnancy}/>
      </main>
    </div>
  )
}

// =====================================================
// PATIENT FORM - UNIFIÉ POUR CRÉATION ET MODIFICATION
// =====================================================
function PatientForm({ profile, setView, mode = 'create', existingPatient = null, existingPregnancy = null }) {
  // Identité
  const [firstName, setFirstName] = useState(existingPatient?.first_name || '')
  const [lastName, setLastName] = useState(existingPatient?.last_name || '')
  const [phone, setPhone] = useState(existingPatient?.phone?.replace('+221', '') || '')
  const [dob, setDob] = useState(existingPatient?.date_of_birth || '')
  const [city, setCity] = useState(existingPatient?.city || '')
  const [region, setRegion] = useState(existingPatient?.region || '')
  const [bloodType, setBloodType] = useState(existingPregnancy?.blood_type || '')

  // Vie sociale
  const [maritalStatus, setMaritalStatus] = useState(existingPatient?.marital_status || '')
  const [numberOfMarriages, setNumberOfMarriages] = useState(String(existingPatient?.number_of_marriages || 0))
  const [occupation, setOccupation] = useState(existingPatient?.occupation || '')
  const [educationLevel, setEducationLevel] = useState(existingPatient?.education_level || '')
  const [hasCmu, setHasCmu] = useState(existingPatient?.has_cmu || false)
  const [hasIpres, setHasIpres] = useState(existingPatient?.has_ipres || false)

  // Antécédents obstétricaux
  const [gravidity, setGravidity] = useState(String(existingPregnancy?.gravidity || 1))
  const [parity, setParity] = useState(String(existingPregnancy?.parity || 0))
  const [livingChildren, setLivingChildren] = useState(String(existingPregnancy?.living_children || 0))
  const [miscarriages, setMiscarriages] = useState(String(existingPregnancy?.miscarriages || 0))
  const [stillbirths, setStillbirths] = useState(String(existingPregnancy?.stillbirths || 0))
  const [neonatalDeaths, setNeonatalDeaths] = useState(String(existingPregnancy?.neonatal_deaths || 0))

  // Antécédents personnels
  const [hasHypertension, setHasHypertension] = useState(existingPregnancy?.has_hypertension || false)
  const [hasDiabetes, setHasDiabetes] = useState(existingPregnancy?.has_diabetes || false)
  const [hasHiv, setHasHiv] = useState(existingPregnancy?.has_hiv || false)
  const [hasSickleCell, setHasSickleCell] = useState(existingPregnancy?.has_sickle_cell || false)
  const [hasAsthma, setHasAsthma] = useState(existingPregnancy?.has_asthma || false)
  const [hasEpilepsy, setHasEpilepsy] = useState(existingPregnancy?.has_epilepsy || false)
  const [hasAnemia, setHasAnemia] = useState(existingPregnancy?.has_anemia || false)
  const [hasThyroid, setHasThyroid] = useState(existingPregnancy?.has_thyroid || false)
  const [hasPreviousCsection, setHasPreviousCsection] = useState(existingPregnancy?.has_previous_csection || false)
  const [hasPreviousHemorrhage, setHasPreviousHemorrhage] = useState(existingPregnancy?.has_previous_hemorrhage || false)
  const [hasPreviousPreeclampsia, setHasPreviousPreeclampsia] = useState(existingPregnancy?.has_previous_preeclampsia || false)

  // Antécédents familiaux
  const [familyHta, setFamilyHta] = useState(existingPregnancy?.family_hta || false)
  const [familyDiabetes, setFamilyDiabetes] = useState(existingPregnancy?.family_diabetes || false)
  const [familySickleCell, setFamilySickleCell] = useState(existingPregnancy?.family_sickle_cell || false)
  const [familyTwins, setFamilyTwins] = useState(existingPregnancy?.family_twins || false)

  // Mode de vie
  const [smokes, setSmokes] = useState(existingPregnancy?.smokes || false)
  const [drinksAlcohol, setDrinksAlcohol] = useState(existingPregnancy?.drinks_alcohol || false)
  const [usesTraditionalMedicine, setUsesTraditionalMedicine] = useState(existingPregnancy?.uses_traditional_medicine || false)

  // Notes
  const [medicalHistoryNotes, setMedicalHistoryNotes] = useState(existingPregnancy?.medical_history_notes || '')

  // Grossesse actuelle
  const [hasPregnancy, setHasPregnancy] = useState(mode === 'edit' ? !!existingPregnancy : true)
  const [lastPeriod, setLastPeriod] = useState(existingPregnancy?.last_period_date || '')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const age = dob ? Math.floor((new Date() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25)) : null
  const riskData = {
    has_hypertension: hasHypertension, has_diabetes: hasDiabetes, has_previous_hemorrhage: hasPreviousHemorrhage,
    has_previous_preeclampsia: hasPreviousPreeclampsia, has_sickle_cell: hasSickleCell, has_hiv: hasHiv,
    has_previous_csection: hasPreviousCsection, has_epilepsy: hasEpilepsy, has_anemia: hasAnemia,
    family_hta: familyHta, family_diabetes: familyDiabetes, family_sickle_cell: familySickleCell,
    smokes, drinks_alcohol: drinksAlcohol,
    stillbirths, neonatal_deaths: neonatalDeaths, miscarriages, age, parity
  }
  const risk = calculateRiskScore(riskData)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      let patientId
      let ipu

      if (mode === 'create') {
        // CRÉATION via RPC
        const { data: result, error: rpcError } = await supabase.rpc('create_patient_by_pro', {
          p_first_name: firstName, p_last_name: lastName, p_phone: '+221' + phone,
          p_date_of_birth: dob || null, p_city: city || null, p_region: region || null,
          p_blood_type: bloodType || null, p_preferred_language: 'fr'
        })
        if (rpcError) throw rpcError
        if (!result || result.length === 0) throw new Error('Création échouée')
        patientId = result[0].patient_id
        ipu = result[0].ipu
      } else {
        // ÉDITION
        patientId = existingPatient.id
        ipu = existingPatient.ipu
        const { error: updError } = await supabase.from('profiles').update({
          first_name: firstName, last_name: lastName, phone: '+221' + phone,
          date_of_birth: dob || null, city: city || null, region: region || null
        }).eq('id', patientId)
        if (updError) throw updError
      }

      // Mise à jour profil avec infos sociales
      await supabase.from('profiles').update({
        marital_status: maritalStatus || null,
        number_of_marriages: parseInt(numberOfMarriages) || 0,
        occupation: occupation || null,
        education_level: educationLevel || null,
        has_cmu: hasCmu, has_ipres: hasIpres
      }).eq('id', patientId)

      // Grossesse : créer ou modifier
      if (hasPregnancy && lastPeriod) {
        const ddr = new Date(lastPeriod)
        const term = new Date(ddr); term.setDate(term.getDate() + 280)
        const pregData = {
          gravidity: parseInt(gravidity), parity: parseInt(parity),
          living_children: parseInt(livingChildren), miscarriages: parseInt(miscarriages),
          stillbirths: parseInt(stillbirths), neonatal_deaths: parseInt(neonatalDeaths),
          blood_type: bloodType || null,
          has_hypertension: hasHypertension, has_diabetes: hasDiabetes, has_hiv: hasHiv,
          has_sickle_cell: hasSickleCell, has_asthma: hasAsthma, has_epilepsy: hasEpilepsy,
          has_anemia: hasAnemia, has_thyroid: hasThyroid,
          has_previous_csection: hasPreviousCsection, has_previous_hemorrhage: hasPreviousHemorrhage,
          has_previous_preeclampsia: hasPreviousPreeclampsia,
          family_hta: familyHta, family_diabetes: familyDiabetes,
          family_sickle_cell: familySickleCell, family_twins: familyTwins,
          smokes, drinks_alcohol: drinksAlcohol, uses_traditional_medicine: usesTraditionalMedicine,
          medical_history_notes: medicalHistoryNotes || null,
          current_risk_level: risk.level
        }
        if (mode === 'create') {
          const { error: pe } = await supabase.from('pregnancies').insert({
            woman_id: patientId, status: 'en_cours',
            last_period_date: lastPeriod, expected_delivery_date: term.toISOString().split('T')[0],
            ...pregData, created_by: profile.id
          })
          if (pe) throw pe
        } else if (existingPregnancy) {
          const { error: pe } = await supabase.from('pregnancies').update({
            last_period_date: lastPeriod, expected_delivery_date: term.toISOString().split('T')[0],
            ...pregData
          }).eq('id', existingPregnancy.id)
          if (pe) throw pe
        } else {
          // Mode edit mais pas de grossesse existante → créer
          const { error: pe } = await supabase.from('pregnancies').insert({
            woman_id: patientId, status: 'en_cours',
            last_period_date: lastPeriod, expected_delivery_date: term.toISOString().split('T')[0],
            ...pregData, created_by: profile.id
          })
          if (pe) throw pe
        }
      }

      setSuccess({ ipu, patientId, mode })
      setLoading(false)
    } catch (err) { setError(err.message); setLoading(false) }
  }

  if (success) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto', marginBottom: 20 }}>✓</div>
        <h2 style={{ fontSize: 26, fontFamily: 'Georgia, serif' }}>
          {success.mode === 'create' ? 'Patiente créée !' : 'Modifications sauvegardées !'}
        </h2>
        <p style={{ fontSize: 14, color: '#5D4037', marginTop: 12 }}>{firstName} {lastName}</p>
        {success.mode === 'create' && (
          <div style={{ marginTop: 20, padding: 16, background: '#F4E4C1', borderRadius: 14 }}>
            <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, textTransform: 'uppercase' }}>IPU à donner à la patiente</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', marginTop: 6 }}>{success.ipu}</div>
          </div>
        )}
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button onClick={() => setView({ name: 'patient', data: success.patientId })} style={{ ...primaryButtonStyle, flex: 1 }}>Voir le dossier →</button>
          <button onClick={() => setView({ name: 'home' })} style={{ ...primaryButtonStyle, flex: 1, background: '#F5F1EB', color: '#5D4037', boxShadow: 'none' }}>Retour</button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormSection number="1" title="Identité">
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
          <div><label style={labelStyle}>Date de naissance</label><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={inputStyle}/>{age && <div style={{ fontSize: 10, color: '#8B6F5C', marginTop: 2 }}>{age} ans</div>}</div>
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
      </FormSection>

      <FormSection number="2" title="Vie sociale">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={labelStyle}>Statut matrimonial</label>
            <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} style={inputStyle}>
              <option value="">—</option>
              <option value="celibataire">Célibataire</option><option value="mariee">Mariée</option>
              <option value="union_libre">Union libre</option><option value="divorcee">Divorcée</option>
              <option value="veuve">Veuve</option>
            </select>
          </div>
          <div><label style={labelStyle}>Nombre de mariages</label><input type="number" min="0" value={numberOfMarriages} onChange={(e) => setNumberOfMarriages(e.target.value)} style={inputStyle}/></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
          <div><label style={labelStyle}>Profession</label><input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Ex: Commerçante" style={inputStyle}/></div>
          <div><label style={labelStyle}>Niveau d'éducation</label>
            <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} style={inputStyle}>
              <option value="">—</option>
              <option value="aucun">Aucune scolarisation</option><option value="primaire">Primaire</option>
              <option value="college">Collège</option><option value="lycee">Lycée</option>
              <option value="superieur">Supérieur</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Couverture santé</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <CheckboxField label="CMU" checked={hasCmu} onChange={setHasCmu}/>
            <CheckboxField label="IPRES" checked={hasIpres} onChange={setHasIpres}/>
          </div>
        </div>
      </FormSection>

      <FormSection number="3" title="Antécédents obstétricaux">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={labelStyle}>Gestité (G)</label><input type="number" min="1" value={gravidity} onChange={(e) => setGravidity(e.target.value)} style={inputStyle}/><div style={{ fontSize: 10, color: '#8B6F5C', marginTop: 4 }}>Total grossesses</div></div>
          <div><label style={labelStyle}>Parité (P)</label><input type="number" min="0" value={parity} onChange={(e) => setParity(e.target.value)} style={inputStyle}/><div style={{ fontSize: 10, color: '#8B6F5C', marginTop: 4 }}>Accouchements ≥ 22 SA</div></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 14 }}>
          <div><label style={labelStyle}>Enfants vivants</label><input type="number" min="0" value={livingChildren} onChange={(e) => setLivingChildren(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Fausses couches</label><input type="number" min="0" value={miscarriages} onChange={(e) => setMiscarriages(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Mort-nés</label><input type="number" min="0" value={stillbirths} onChange={(e) => setStillbirths(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Décès néonatal</label><input type="number" min="0" value={neonatalDeaths} onChange={(e) => setNeonatalDeaths(e.target.value)} style={inputStyle}/></div>
        </div>
      </FormSection>

      <FormSection number="4" title="Antécédents personnels">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <CheckboxField label="HTA" checked={hasHypertension} onChange={setHasHypertension}/>
          <CheckboxField label="Diabète" checked={hasDiabetes} onChange={setHasDiabetes}/>
          <CheckboxField label="VIH" checked={hasHiv} onChange={setHasHiv}/>
          <CheckboxField label="Drépanocytose" checked={hasSickleCell} onChange={setHasSickleCell}/>
          <CheckboxField label="Asthme" checked={hasAsthma} onChange={setHasAsthma}/>
          <CheckboxField label="Épilepsie" checked={hasEpilepsy} onChange={setHasEpilepsy}/>
          <CheckboxField label="Anémie" checked={hasAnemia} onChange={setHasAnemia}/>
          <CheckboxField label="Thyroïde" checked={hasThyroid} onChange={setHasThyroid}/>
          <CheckboxField label="Antécédent césarienne" checked={hasPreviousCsection} onChange={setHasPreviousCsection}/>
          <CheckboxField label="Antécédent HPP" checked={hasPreviousHemorrhage} onChange={setHasPreviousHemorrhage}/>
          <CheckboxField label="Pré-éclampsie ant." checked={hasPreviousPreeclampsia} onChange={setHasPreviousPreeclampsia}/>
        </div>
      </FormSection>

      <FormSection number="5" title="Antécédents familiaux">
        <div style={{ fontSize: 12, color: '#8B6F5C', marginBottom: 12 }}>Cocher si présent chez les parents ou la fratrie</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <CheckboxField label="HTA familiale" checked={familyHta} onChange={setFamilyHta}/>
          <CheckboxField label="Diabète familial" checked={familyDiabetes} onChange={setFamilyDiabetes}/>
          <CheckboxField label="Drépanocytose familiale" checked={familySickleCell} onChange={setFamilySickleCell}/>
          <CheckboxField label="Jumeaux dans la famille" checked={familyTwins} onChange={setFamilyTwins}/>
        </div>
      </FormSection>

      <FormSection number="6" title="Mode de vie">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <CheckboxField label="🚬 Tabac" checked={smokes} onChange={setSmokes}/>
          <CheckboxField label="🍺 Alcool" checked={drinksAlcohol} onChange={setDrinksAlcohol}/>
          <CheckboxField label="🌿 Médecine traditionnelle" checked={usesTraditionalMedicine} onChange={setUsesTraditionalMedicine}/>
        </div>
      </FormSection>

      <FormSection number="7" title="Notes médicales">
        <textarea value={medicalHistoryNotes} onChange={(e) => setMedicalHistoryNotes(e.target.value)} rows={3} placeholder="Allergies, traitements, observations..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}/>
      </FormSection>

      <FormSection number="8" title="Grossesse actuelle">
        <div style={{ display: 'flex', gap: 4, background: '#F5F1EB', borderRadius: 10, padding: 3, marginBottom: 14 }}>
          <button type="button" onClick={() => setHasPregnancy(true)} style={{ flex: 1, padding: 10, borderRadius: 8, background: hasPregnancy ? '#C44536' : 'transparent', color: hasPregnancy ? '#FAF6F0' : '#5D4037', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Grossesse en cours</button>
          <button type="button" onClick={() => setHasPregnancy(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: !hasPregnancy ? '#FFFFFF' : 'transparent', color: !hasPregnancy ? '#2a1810' : '#5D4037', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Pas de grossesse</button>
        </div>
        {hasPregnancy && (
          <div>
            <label style={labelStyle}>DDR (Date des Dernières Règles) *</label>
            <input type="date" value={lastPeriod} onChange={(e) => setLastPeriod(e.target.value)} required={hasPregnancy} style={inputStyle}/>
          </div>
        )}
      </FormSection>

      {/* 🤖 SCORE IA - mis à jour en temps réel */}
      {hasPregnancy && (
        <div style={{ marginTop: 16, padding: 18, background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F1EB 100%)', border: `2px solid ${risk.color}`, borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: risk.color, color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>IA · Évaluation automatique du risque</div>
              <div style={{ fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 700, color: risk.color, marginTop: 2 }}>{risk.badge} Risque {risk.label}</div>
            </div>
            <div style={{ padding: '6px 14px', background: risk.color, color: '#FAF6F0', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Score: {risk.score}</div>
          </div>
          {risk.factors.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, marginBottom: 8 }}>Facteurs détectés ({risk.factors.length}):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {risk.factors.map((f, i) => (
                  <div key={i} style={{ padding: '4px 10px', background: '#FFFFFF', borderRadius: 6, fontSize: 11, color: '#5D4037', border: '1px solid rgba(42,24,16,0.06)' }}>{f.label} <span style={{ color: '#C44536', fontWeight: 700 }}>+{f.weight}</span></div>
                ))}
              </div>
            </div>
          )}
          {risk.factors.length === 0 && <div style={{ fontSize: 12, color: '#1F4341', fontStyle: 'italic' }}>Aucun facteur de risque majeur détecté.</div>}
          <div style={{ marginTop: 12, padding: 10, background: '#F5F1EB', borderRadius: 8, fontSize: 11, color: '#5D4037', fontStyle: 'italic' }}>
            ℹ️ Évaluation algorithmique. Reste à la sage-femme/médecin de juger cliniquement. Score recalculé automatiquement à chaque CPN.
          </div>
        </div>
      )}

      {error && <div style={{ marginTop: 16, padding: 14, background: '#FFE8E2', borderRadius: 12, color: '#8B2E26' }}>⚠️ {error}</div>}

      <div style={{ marginTop: 20, display: 'flex', gap: 10, marginBottom: 32 }}>
        <button type="button" onClick={() => setView({ name: mode === 'edit' ? 'patient' : 'home', data: mode === 'edit' ? existingPatient?.id : null })} style={{ flex: 1, padding: 14, background: '#F5F1EB', color: '#5D4037', borderRadius: 14, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
        <button type="submit" disabled={loading} style={{ flex: 2, ...primaryButtonStyle, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', opacity: loading ? 0.6 : 1 }}>{loading ? '...' : (mode === 'edit' ? '💾 Sauvegarder les modifications' : '✓ Créer la patiente')}</button>
      </div>
    </form>
  )
}

function FormSection({ number, title, children }) {
  return (
    <div style={{ ...cardStyle, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{number}</div>
        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Georgia, serif' }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: checked ? '#FFE8E2' : '#F5F1EB', borderRadius: 10, cursor: 'pointer', border: checked ? '1px solid #C44536' : '1px solid transparent', fontSize: 13, fontWeight: 500 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: '#C44536' }}/>
      <span>{label}</span>
    </label>
  )
}

function RequestExistingPatientForm({ openPatientDossier }) {
  const [ipu, setIpu] = useState('')
  const [error, setError] = useState(null)
  async function handleSearch(e) {
    e.preventDefault(); setError(null)
    const { data } = await supabase.from('profiles').select('id').eq('ipu', ipu.trim().toUpperCase()).eq('role', 'femme').maybeSingle()
    if (!data) setError(`Aucune patiente trouvée avec l'IPU ${ipu.toUpperCase()}`)
    else openPatientDossier(data.id)
  }
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 18, fontFamily: 'Georgia, serif', marginBottom: 16 }}>Patiente déjà inscrite</div>
      <form onSubmit={handleSearch}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" value={ipu} onChange={(e) => setIpu(e.target.value.toUpperCase())} placeholder="SN-2026-XXXXXX" required style={{ ...inputStyle, fontFamily: 'monospace', flex: 1 }}/>
          <button type="submit" disabled={ipu.length < 6} style={{ padding: '12px 24px', background: ipu.length >= 6 ? 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)' : '#F5F1EB', color: ipu.length >= 6 ? '#FAF6F0' : '#8B6F5C', borderRadius: 12, fontWeight: 700, border: 'none', cursor: ipu.length >= 6 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>Ouvrir</button>
        </div>
      </form>
      {error && <div style={{ marginTop: 14, padding: 12, background: '#FFE8E2', borderRadius: 10, color: '#8B2E26', fontSize: 12 }}>⚠️ {error}</div>}
    </div>
  )
}

function SearchExistingPatientForm({ openPatientDossier }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  async function handleSearch(e) {
    e.preventDefault()
    if (query.length < 2) return
    const { data } = await supabase.from('profiles').select('id, first_name, last_name, ipu, phone').eq('role', 'femme').or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`).limit(20)
    setResults(data || [])
  }
  return (
    <div>
      <div style={cardStyle}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, prénom ou téléphone" style={{ ...inputStyle, flex: 1 }}/>
            <button type="submit" disabled={query.length < 2} style={{ padding: '12px 24px', background: query.length >= 2 ? 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)' : '#F5F1EB', color: query.length >= 2 ? '#FAF6F0' : '#8B6F5C', borderRadius: 12, fontWeight: 700, border: 'none', cursor: query.length >= 2 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>🔍 Rechercher</button>
          </div>
        </form>
      </div>
      {results.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          {results.map(p => (
            <button key={p.id} onClick={() => openPatientDossier(p.id)} style={{ ...patientRowStyle, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{p.first_name?.[0]}{p.last_name?.[0]}</div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{p.first_name} {p.last_name}</div>
                <div style={{ fontSize: 11, color: '#8B6F5C', fontFamily: 'monospace' }}>{p.ipu}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ⚠️ Les composants suivants sont définis dans PARTIE 2 :
// PatientFileView, NewCPNView, NewPregnancyView, AlertDetailView

// =====================================================
// STYLES PARTAGÉS
// =====================================================
const loadingStyle = { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FAF6F0', fontFamily: 'system-ui, -apple-system, sans-serif' }
const pageStyle = { minHeight: '100vh', background: '#F5F1EB', fontFamily: 'system-ui, -apple-system, sans-serif' }
const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: '#FFFFFF', borderBottom: '1px solid rgba(42,24,16,0.08)', position: 'sticky', top: 0, zIndex: 10 }
const authBgStyle = { minHeight: '100vh', background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 50%, #2D5F5D 100%)', fontFamily: 'system-ui, -apple-system, sans-serif', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const authCardStyle = { background: '#FAF6F0', maxWidth: 440, width: '100%', padding: 40, borderRadius: 24, boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }
const logoSmallStyle = { width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FAF6F0', fontSize: 22 }
const cardStyle = { background: '#FFFFFF', borderRadius: 18, padding: 20, border: '1px solid rgba(42,24,16,0.04)' }
const labelStyle = { fontSize: 11, color: '#8B6F5C', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }
const inputStyle = { width: '100%', padding: '11px 14px', fontSize: 14, fontWeight: 500, color: '#2a1810', background: '#FFFFFF', border: '2px solid rgba(42,24,16,0.08)', borderRadius: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
const primaryButtonStyle = { width: '100%', padding: 13, background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', borderRadius: 14, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 6px 16px rgba(196,69,54,0.3)', fontFamily: 'inherit' }
const linkButtonStyle = { color: '#C44536', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }
const errorBoxStyle = { marginTop: 14, padding: 12, background: '#FFE8E2', borderRadius: 10, color: '#8B2E26', fontSize: 12, fontWeight: 500 }
const backButtonStyle = { padding: 10, background: '#F5F1EB', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#5D4037' }
const avatarStyle = { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }
const sectionLabelStyle = { fontSize: 11, color: '#8B6F5C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }
const searchHeroStyle = { padding: 24, borderRadius: 20, background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)' }
const patientRowStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#FAF6F0', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }

if (typeof document !== 'undefined' && !document.getElementById('yaay-pro-animations')) {
  const style = document.createElement('style')
  style.id = 'yaay-pro-animations'
  style.textContent = `@keyframes pulse-alert { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }`
  document.head.appendChild(style)
}
// =====================================================
// YAAY PRO - APP.JS PARTIE 2/2
// PatientFileView + Examens + NewCPN + NewPregnancy + Alert
// À CONCATÉNER avec yaay_pro_part1.jsx
//
// IMPORTANT : Coller cette partie À LA SUITE du contenu
// de yaay_pro_part1.jsx dans App.js (avant la dernière ligne avec styles)
// =====================================================

// =====================================================
// PATIENT FILE VIEW - avec onglet Examens + bouton Modifier
// =====================================================
function PatientFileView({ profile, patientId, setView }) {
  const [patient, setPatient] = useState(null)
  const [currentPregnancy, setCurrentPregnancy] = useState(null)
  const [pastPregnancies, setPastPregnancies] = useState([])
  const [consultations, setConsultations] = useState([])
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  async function loadPatient() {
    setLoading(true)
    const { data: p } = await supabase.from('profiles').select('*').eq('id', patientId).single()
    setPatient(p)
    const { data: pregs } = await supabase.from('pregnancies').select('*').eq('woman_id', patientId).order('last_period_date', { ascending: false })
    if (pregs) {
      const current = pregs.find(p => p.status === 'en_cours')
      setCurrentPregnancy(current)
      setPastPregnancies(pregs.filter(p => p.status !== 'en_cours'))
      if (current) {
        const { data: cpns } = await supabase.from('consultations').select('*').eq('pregnancy_id', current.id).order('consultation_date', { ascending: false })
        if (cpns && cpns.length > 0) {
          const proIds = [...new Set(cpns.map(c => c.performed_by).filter(Boolean))]
          const { data: pros } = await supabase.from('profiles').select('id, first_name, last_name').in('id', proIds)
          setConsultations(cpns.map(c => ({ ...c, performed_by_profile: pros?.find(pro => pro.id === c.performed_by) })))
        } else setConsultations([])
        const { data: dueExams } = await supabase.rpc('get_due_exams', { p_pregnancy_id: current.id })
        setExams(dueExams || [])
      } else { setConsultations([]); setExams([]) }
    }
    setLoading(false)
  }

  useEffect(() => { loadPatient() }, [patientId])
  useEffect(() => {
    if (!patientId) return
    const channel = supabase.channel('patient-' + patientId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, () => loadPatient())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pregnancies', filter: `woman_id=eq.${patientId}` }, () => loadPatient())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_results' }, () => loadPatient())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [patientId])

  if (loading) return <LoadingScreen />
  if (!patient) return <div>Patiente introuvable.</div>

  const weeks = currentPregnancy ? Math.floor((new Date() - new Date(currentPregnancy.last_period_date)) / (1000 * 60 * 60 * 24 * 7)) : null
  const age = patient.date_of_birth ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25)) : null
  const lateExams = exams.filter(e => e.is_late).length

  const riskInfo = currentPregnancy ? calculateRiskScore(extractRiskDataFromPregnancy(currentPregnancy, patient)) : null
  const recommendation = riskInfo ? getRiskRecommendation(riskInfo.level) : null

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView({ name: 'editPatient', data: patientId })} style={{ padding: '12px 16px', background: '#F5F1EB', color: '#5D4037', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>✏️ Modifier</button>
          {currentPregnancy ? (
            <button onClick={() => setView({ name: 'newCPN', data: { pregnancyId: currentPregnancy.id, patientId } })} style={{ padding: '12px 18px', background: 'linear-gradient(135deg, #C44536 0%, #8B2E26 100%)', color: '#FAF6F0', borderRadius: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>➕ Nouvelle CPN</button>
          ) : (
            <button onClick={() => setView({ name: 'newPregnancy', data: patientId })} style={{ padding: '12px 18px', background: 'linear-gradient(135deg, #2D5F5D 0%, #1F4341 100%)', color: '#FAF6F0', borderRadius: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Démarrer grossesse</button>
          )}
        </div>
      </header>

      <main style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(42,24,16,0.08)', marginBottom: 24 }}>
          {[
            { id: 'overview', label: '🏠 Vue d\'ensemble' },
            { id: 'cpn', label: `🩺 CPN (${consultations.length})` },
            { id: 'exams', label: `🧪 Examens${lateExams > 0 ? ` ⚠️${lateExams}` : ''}` },
            { id: 'history', label: '📜 Historique' }
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600, color: tab === t.id ? '#C44536' : '#8B6F5C', borderBottom: tab === t.id ? '2px solid #C44536' : '2px solid transparent', marginBottom: -1, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{t.label}</button>
          ))}
        </div>

        {/* TAB OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
            {/* Colonne gauche - Score IA + vitals */}
            <div>
              {riskInfo && (
                <div style={{ ...cardStyle, borderTop: `4px solid ${riskInfo.color}`, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 50, height: 50, borderRadius: 14, background: riskInfo.color, color: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🤖</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, textTransform: 'uppercase' }}>IA · Évaluation du risque</div>
                      <div style={{ fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 700, color: riskInfo.color, marginTop: 2 }}>{riskInfo.badge} Risque {riskInfo.label}</div>
                    </div>
                    <div style={{ padding: '6px 14px', background: riskInfo.color, color: '#FAF6F0', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Score: {riskInfo.score}</div>
                  </div>
                  {riskInfo.factors.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, marginBottom: 8 }}>Facteurs détectés:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {riskInfo.factors.map((f, i) => (
                          <div key={i} style={{ padding: '4px 10px', background: '#F5F1EB', borderRadius: 6, fontSize: 11, color: '#5D4037', border: '1px solid rgba(42,24,16,0.06)' }}>{f.label} <span style={{ color: '#C44536', fontWeight: 700 }}>+{f.weight}</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                  {recommendation && (
                    <div style={{ padding: 14, background: '#F5F1EB', borderRadius: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#2a1810', marginBottom: 8 }}>📋 {recommendation.title}</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#5D4037', lineHeight: 1.6 }}>
                        {recommendation.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Grossesse actuelle */}
              {currentPregnancy ? (
                <div style={cardStyle}>
                  <div style={sectionLabelStyle}>Grossesse en cours</div>
                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <InfoItem label="SA" value={weeks ? `S${weeks}` : '—'}/>
                    <InfoItem label="DDR" value={new Date(currentPregnancy.last_period_date).toLocaleDateString('fr-FR')}/>
                    <InfoItem label="Terme" value={new Date(currentPregnancy.expected_delivery_date).toLocaleDateString('fr-FR')}/>
                    <InfoItem label="G/P" value={`G${currentPregnancy.gravidity} P${currentPregnancy.parity}`}/>
                    <InfoItem label="Enfants" value={currentPregnancy.living_children || 0}/>
                    <InfoItem label="Groupe" value={currentPregnancy.blood_type || '—'}/>
                  </div>
                  {currentPregnancy.medical_history_notes && (
                    <div style={{ marginTop: 14, padding: 12, background: '#F5F1EB', borderRadius: 10, fontSize: 12, color: '#5D4037' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#8B6F5C', marginBottom: 4 }}>NOTES MÉDICALES</div>
                      {currentPregnancy.medical_history_notes}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ ...cardStyle, textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🤰</div>
                  <div style={{ fontSize: 14, color: '#5D4037' }}>Aucune grossesse en cours</div>
                </div>
              )}
            </div>

            {/* Colonne droite - Antécédents */}
            <div>
              <div style={cardStyle}>
                <div style={sectionLabelStyle}>Antécédents médicaux</div>
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    [currentPregnancy?.has_hypertension, 'HTA'],
                    [currentPregnancy?.has_diabetes, 'Diabète'],
                    [currentPregnancy?.has_hiv, 'VIH'],
                    [currentPregnancy?.has_sickle_cell, 'Drépano'],
                    [currentPregnancy?.has_asthma, 'Asthme'],
                    [currentPregnancy?.has_epilepsy, 'Épilepsie'],
                    [currentPregnancy?.has_anemia, 'Anémie'],
                    [currentPregnancy?.has_thyroid, 'Thyroïde'],
                    [currentPregnancy?.has_previous_csection, 'Césarienne ant.'],
                    [currentPregnancy?.has_previous_hemorrhage, 'HPP ant.'],
                    [currentPregnancy?.has_previous_preeclampsia, 'Pré-éclampsie ant.']
                  ].filter(([v]) => v).map(([, l], i) => (
                    <Badge key={i} text={l} color="#C44536"/>
                  ))}
                  {![currentPregnancy?.has_hypertension, currentPregnancy?.has_diabetes, currentPregnancy?.has_hiv, currentPregnancy?.has_sickle_cell].some(Boolean) && (
                    <div style={{ fontSize: 12, color: '#8B6F5C', fontStyle: 'italic' }}>Aucun antécédent personnel</div>
                  )}
                </div>
              </div>
              <div style={{ ...cardStyle, marginTop: 16 }}>
                <div style={sectionLabelStyle}>Antécédents familiaux</div>
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    [currentPregnancy?.family_hta, 'HTA fam.'],
                    [currentPregnancy?.family_diabetes, 'Diabète fam.'],
                    [currentPregnancy?.family_sickle_cell, 'Drépano fam.'],
                    [currentPregnancy?.family_twins, 'Jumeaux fam.']
                  ].filter(([v]) => v).map(([, l], i) => (
                    <Badge key={i} text={l} color="#D4A574"/>
                  ))}
                  {![currentPregnancy?.family_hta, currentPregnancy?.family_diabetes, currentPregnancy?.family_sickle_cell, currentPregnancy?.family_twins].some(Boolean) && (
                    <div style={{ fontSize: 12, color: '#8B6F5C', fontStyle: 'italic' }}>Aucun antécédent familial</div>
                  )}
                </div>
              </div>
              <div style={{ ...cardStyle, marginTop: 16 }}>
                <div style={sectionLabelStyle}>Mode de vie</div>
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {currentPregnancy?.smokes && <Badge text="🚬 Tabac" color="#8B2E26"/>}
                  {currentPregnancy?.drinks_alcohol && <Badge text="🍺 Alcool" color="#8B2E26"/>}
                  {currentPregnancy?.uses_traditional_medicine && <Badge text="🌿 Médecine trad." color="#8B6F5C"/>}
                  {!currentPregnancy?.smokes && !currentPregnancy?.drinks_alcohol && !currentPregnancy?.uses_traditional_medicine && (
                    <div style={{ fontSize: 12, color: '#1F4341', fontStyle: 'italic' }}>✓ Aucun facteur</div>
                  )}
                </div>
              </div>
              <div style={{ ...cardStyle, marginTop: 16 }}>
                <div style={sectionLabelStyle}>Situation sociale</div>
                <div style={{ marginTop: 12, fontSize: 12, color: '#5D4037', lineHeight: 1.8 }}>
                  <div>Statut: <strong>{patient.marital_status || '—'}</strong></div>
                  <div>Profession: <strong>{patient.occupation || '—'}</strong></div>
                  <div>Éducation: <strong>{patient.education_level || '—'}</strong></div>
                  <div>Couverture: {patient.has_cmu && <Badge text="CMU" color="#2D5F5D"/>} {patient.has_ipres && <Badge text="IPRES" color="#2D5F5D"/>}{!patient.has_cmu && !patient.has_ipres && '—'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CPN */}
        {tab === 'cpn' && (
          <div>
            {consultations.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 50, marginBottom: 12 }}>🩺</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Aucune CPN enregistrée</div>
                {currentPregnancy && <button onClick={() => setView({ name: 'newCPN', data: { pregnancyId: currentPregnancy.id, patientId } })} style={{ ...primaryButtonStyle, marginTop: 20, maxWidth: 280 }}>➕ Saisir première CPN</button>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {consultations.map(c => (
                  <div key={c.id} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>CPN du {new Date(c.consultation_date).toLocaleDateString('fr-FR')}</div>
                        <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2 }}>S{c.gestational_age_weeks || '—'} · {c.performed_by_profile ? `${c.performed_by_profile.first_name} ${c.performed_by_profile.last_name}` : '—'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      <VitalCard label="Poids" value={c.weight_kg} unit="kg"/>
                      <VitalCard label="TA" value={c.blood_pressure_systolic && c.blood_pressure_diastolic ? `${c.blood_pressure_systolic}/${c.blood_pressure_diastolic}` : null} unit=""/>
                      <VitalCard label="HU" value={c.uterine_height_cm} unit="cm"/>
                      <VitalCard label="BCF" value={c.fetal_heart_rate} unit="bpm"/>
                    </div>
                    {c.observations && (
                      <div style={{ marginTop: 12, padding: 12, background: '#F5F1EB', borderRadius: 10, fontSize: 13, color: '#5D4037', whiteSpace: 'pre-wrap' }}>{c.observations}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB EXAMENS */}
        {tab === 'exams' && (
          <ExamsTab pregnancyId={currentPregnancy?.id} exams={exams} profile={profile} onChange={loadPatient}/>
        )}

        {/* TAB HISTORIQUE */}
        {tab === 'history' && (
          <div>
            {pastPregnancies.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: 40, color: '#8B6F5C' }}>Aucune grossesse antérieure</div>
            ) : pastPregnancies.map(p => (
              <div key={p.id} style={{ ...cardStyle, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Grossesse {new Date(p.last_period_date).getFullYear()}</div>
                <div style={{ fontSize: 12, color: '#8B6F5C' }}>Statut: {p.status}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div style={{ padding: 10, background: '#F5F1EB', borderRadius: 10 }}>
      <div style={{ fontSize: 10, color: '#8B6F5C', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#2a1810', marginTop: 2 }}>{value}</div>
    </div>
  )
}

function VitalCard({ label, value, unit }) {
  return (
    <div style={{ background: '#F5F1EB', borderRadius: 10, padding: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#8B6F5C', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 16, fontFamily: 'Georgia, serif', fontWeight: 700, marginTop: 4 }}>{value || '—'} <span style={{ fontSize: 10, color: '#8B6F5C', fontWeight: 400 }}>{unit}</span></div>
    </div>
  )
}

function Badge({ text, color }) {
  return (
    <span style={{ display: 'inline-block', padding: '4px 10px', background: `${color}20`, color, borderRadius: 6, fontSize: 11, fontWeight: 700, marginRight: 4 }}>{text}</span>
  )
}

// =====================================================
// EXAMS TAB - Onglet examens du dossier patiente
// =====================================================
function ExamsTab({ pregnancyId, exams, profile, onChange }) {
  const [updatingExam, setUpdatingExam] = useState(null)
  const [showResultModal, setShowResultModal] = useState(null)

  async function prescribeExam(exam) {
    setUpdatingExam(exam.exam_code)
    try {
      const { error } = await supabase.from('exam_results').upsert({
        pregnancy_id: pregnancyId, exam_code: exam.exam_code,
        status: 'prescrit', prescribed_at: new Date().toISOString(),
        prescribed_by: profile.id
      }, { onConflict: 'pregnancy_id,exam_code' })
      if (error) throw error
      onChange()
    } catch (err) { alert('Erreur: ' + err.message) } finally { setUpdatingExam(null) }
  }

  if (!pregnancyId) {
    return <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>Aucune grossesse en cours</div>
  }

  const lateExams = exams.filter(e => e.is_late)
  const todoExams = exams.filter(e => e.current_status === 'a_faire' && !e.is_late)
  const prescribedExams = exams.filter(e => e.current_status === 'prescrit')
  const doneExams = exams.filter(e => ['realise', 'resultat_recu'].includes(e.current_status))
  const abnormalExams = exams.filter(e => e.current_status === 'anormal')

  return (
    <div>
      {lateExams.length > 0 && (
        <div style={{ marginBottom: 16, padding: 16, background: 'linear-gradient(135deg, #FFE8E2 0%, #FFFFFF 100%)', border: '2px solid #C44536', borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 32 }}>⚠️</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#8B2E26' }}>{lateExams.length} examen{lateExams.length > 1 ? 's' : ''} en retard !</div>
              <div style={{ fontSize: 12, color: '#5D4037', marginTop: 2 }}>Examens recommandés mais non encore prescrits.</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {lateExams.length > 0 && (
          <ExamSection title="🚨 En retard" exams={lateExams} color="#C44536" onPrescribe={prescribeExam} onSeeResult={setShowResultModal} updatingExam={updatingExam}/>
        )}
        {abnormalExams.length > 0 && (
          <ExamSection title="⚠️ Résultats anormaux" exams={abnormalExams} color="#C44536" onPrescribe={prescribeExam} onSeeResult={setShowResultModal} updatingExam={updatingExam}/>
        )}
        {todoExams.length > 0 && (
          <ExamSection title="📋 À prescrire" exams={todoExams} color="#D4A574" onPrescribe={prescribeExam} onSeeResult={setShowResultModal} updatingExam={updatingExam}/>
        )}
        {prescribedExams.length > 0 && (
          <ExamSection title="✓ Prescrits" exams={prescribedExams} color="#8B6F5C" onPrescribe={prescribeExam} onSeeResult={setShowResultModal} updatingExam={updatingExam}/>
        )}
        {doneExams.length > 0 && (
          <ExamSection title="✓✓ Réalisés" exams={doneExams} color="#1F4341" onPrescribe={prescribeExam} onSeeResult={setShowResultModal} updatingExam={updatingExam}/>
        )}
      </div>

      {exams.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 50, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, color: '#5D4037' }}>Aucun examen requis à ce stade.</div>
        </div>
      )}

      {showResultModal && (
        <ExamResultModal exam={showResultModal} pregnancyId={pregnancyId} profile={profile} onClose={() => setShowResultModal(null)} onSaved={() => { setShowResultModal(null); onChange() }}/>
      )}
    </div>
  )
}

function ExamSection({ title, exams, color, onPrescribe, onSeeResult, updatingExam }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${color}30` }}>{title} ({exams.length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {exams.map(e => (
          <div key={e.exam_code} style={{ padding: 12, background: '#FAF6F0', borderRadius: 10, border: '1px solid rgba(42,24,16,0.04)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2a1810' }}>{e.exam_name_fr}</div>
            <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2 }}>Recommandé à S{e.recommended_at_week}</div>
            {e.description && <div style={{ fontSize: 11, color: '#5D4037', marginTop: 4, fontStyle: 'italic' }}>{e.description}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {e.current_status === 'a_faire' && (
                <button onClick={() => onPrescribe(e)} disabled={updatingExam === e.exam_code} style={{ flex: 1, padding: 8, background: '#D4A574', color: '#FAF6F0', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{updatingExam === e.exam_code ? '...' : '📋 Prescrire'}</button>
              )}
              {e.current_status === 'prescrit' && (
                <button onClick={() => onSeeResult(e)} style={{ flex: 1, padding: 8, background: '#2D5F5D', color: '#FAF6F0', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>📝 Saisir résultat</button>
              )}
              {['realise', 'resultat_recu', 'anormal'].includes(e.current_status) && (
                <button onClick={() => onSeeResult(e)} style={{ flex: 1, padding: 8, background: '#FAF6F0', color: '#5D4037', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid rgba(42,24,16,0.1)', cursor: 'pointer', fontFamily: 'inherit' }}>👁 Voir détails</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExamResultModal({ exam, pregnancyId, profile, onClose, onSaved }) {
  const [resultValue, setResultValue] = useState('')
  const [isAbnormal, setIsAbnormal] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    try {
      const { error } = await supabase.from('exam_results').upsert({
        pregnancy_id: pregnancyId, exam_code: exam.exam_code,
        status: isAbnormal ? 'anormal' : 'resultat_recu',
        result_value: resultValue, result_notes: notes,
        is_abnormal: isAbnormal, result_received_at: new Date().toISOString(),
        recorded_by: profile.id
      }, { onConflict: 'pregnancy_id,exam_code' })
      if (error) throw error
      onSaved()
    } catch (err) { alert('Erreur: ' + err.message); setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ background: '#FAF6F0', borderRadius: 18, padding: 24, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700, textTransform: 'uppercase' }}>Saisir résultat</div>
            <div style={{ fontSize: 20, fontFamily: 'Georgia, serif', fontWeight: 700, marginTop: 4 }}>{exam.exam_name_fr}</div>
          </div>
          <button onClick={onClose} style={{ padding: 8, background: '#F5F1EB', border: 'none', borderRadius: 8, cursor: 'pointer' }}>✕</button>
        </div>
        <div>
          <label style={labelStyle}>Résultat</label>
          <textarea value={resultValue} onChange={(e) => setResultValue(e.target.value)} rows={3} placeholder="Saisir le résultat..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}/>
        </div>
        <div style={{ marginTop: 14 }}>
          <CheckboxField label="⚠️ Résultat anormal" checked={isAbnormal} onChange={setIsAbnormal}/>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observations..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}/>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, background: '#F5F1EB', color: '#5D4037', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          <button onClick={save} disabled={loading} style={{ flex: 2, ...primaryButtonStyle, opacity: loading ? 0.6 : 1 }}>{loading ? '...' : '💾 Enregistrer'}</button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// NEW CPN - avec suggestions d'examens
// =====================================================
function NewCPNView({ profile, pregnancyId, patientId, setView }) {
  const [weight, setWeight] = useState('')
  const [bpSys, setBpSys] = useState('')
  const [bpDia, setBpDia] = useState('')
  const [uh, setUh] = useState('')
  const [bcf, setBcf] = useState('')
  const [observations, setObservations] = useState('')
  const [dueExams, setDueExams] = useState([])
  const [selectedExams, setSelectedExams] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pregnancy, setPregnancy] = useState(null)
  const [patient, setPatient] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('pregnancies').select('*').eq('id', pregnancyId).single()
      const { data: pat } = await supabase.from('profiles').select('*').eq('id', patientId).single()
      setPregnancy(p); setPatient(pat)
      const { data: exams } = await supabase.rpc('get_due_exams', { p_pregnancy_id: pregnancyId })
      const toPrescribe = (exams || []).filter(e => e.current_status === 'a_faire')
      setDueExams(toPrescribe)
      setSelectedExams(toPrescribe.filter(e => e.is_late).map(e => e.exam_code))
    }
    load()
  }, [pregnancyId, patientId])

  const weeks = pregnancy ? Math.floor((new Date() - new Date(pregnancy.last_period_date)) / (1000 * 60 * 60 * 24 * 7)) : null

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      // 1. Créer la CPN
      const { error: ce } = await supabase.from('consultations').insert({
        pregnancy_id: pregnancyId, performed_by: profile.id,
        consultation_date: new Date().toISOString().split('T')[0],
        gestational_age_weeks: weeks,
        weight_kg: parseFloat(weight) || null,
        blood_pressure_systolic: parseInt(bpSys) || null,
        blood_pressure_diastolic: parseInt(bpDia) || null,
        uterine_height_cm: parseFloat(uh) || null,
        fetal_heart_rate: parseInt(bcf) || null,
        observations: observations || null
      })
      if (ce) throw ce

      // 2. Prescrire les examens sélectionnés
      if (selectedExams.length > 0) {
        const examRows = selectedExams.map(code => ({
          pregnancy_id: pregnancyId, exam_code: code,
          status: 'prescrit', prescribed_at: new Date().toISOString(), prescribed_by: profile.id
        }))
        await supabase.from('exam_results').upsert(examRows, { onConflict: 'pregnancy_id,exam_code' })
      }

      // 3. Recalculer le score de risque (en intégrant TA si élevée)
      const newRiskData = extractRiskDataFromPregnancy(pregnancy, patient)
      // Si TA élevée à cette CPN, on peut booster le score
      if (parseInt(bpSys) >= 140 || parseInt(bpDia) >= 90) {
        newRiskData.has_hypertension = true  // Détection HTA gravidique
      }
      const newRisk = calculateRiskScore(newRiskData)
      await supabase.from('pregnancies').update({ current_risk_level: newRisk.level }).eq('id', pregnancyId)

      setView({ name: 'patient', data: patientId })
    } catch (err) { setError(err.message); setLoading(false) }
  }

  function toggleExam(code) {
    setSelectedExams(s => s.includes(code) ? s.filter(c => c !== code) : [...s, code])
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView({ name: 'patient', data: patientId })} style={backButtonStyle}>← Retour</button>
        <div style={{ flex: 1, marginLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>➕ Nouvelle CPN</div>
          <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2 }}>{patient?.first_name} {patient?.last_name} · S{weeks || '—'}</div>
        </div>
      </header>
      <main style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <FormSection number="1" title="Constantes vitales">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <div><label style={labelStyle}>Poids (kg)</label><input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} style={inputStyle}/></div>
              <div><label style={labelStyle}>TA Systolique</label><input type="number" value={bpSys} onChange={(e) => setBpSys(e.target.value)} placeholder="120" style={inputStyle}/></div>
              <div><label style={labelStyle}>TA Diastolique</label><input type="number" value={bpDia} onChange={(e) => setBpDia(e.target.value)} placeholder="80" style={inputStyle}/></div>
              <div><label style={labelStyle}>HU (cm)</label><input type="number" step="0.1" value={uh} onChange={(e) => setUh(e.target.value)} style={inputStyle}/></div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>BCF (bpm)</label><input type="number" value={bcf} onChange={(e) => setBcf(e.target.value)} placeholder="140" style={inputStyle}/>
            </div>
            {(parseInt(bpSys) >= 140 || parseInt(bpDia) >= 90) && (
              <div style={{ marginTop: 10, padding: 10, background: '#FFE8E2', border: '1px solid #C44536', borderRadius: 10, fontSize: 12, color: '#8B2E26' }}>
                ⚠️ <strong>Tension élevée détectée</strong> · Risque pré-éclampsie. Le score IA sera reclassé.
              </div>
            )}
          </FormSection>

          {/* SUGGESTIONS IA D'EXAMENS */}
          {dueExams.length > 0 && (
            <FormSection number="2" title="🤖 Examens à prescrire (suggérés par l'IA)">
              <div style={{ fontSize: 12, color: '#5D4037', marginBottom: 12 }}>L'IA suggère ces examens en fonction de la SA. Cochez ceux à prescrire :</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dueExams.map(e => (
                  <label key={e.exam_code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: e.is_late ? '#FFE8E2' : '#F5F1EB', borderRadius: 10, cursor: 'pointer', border: e.is_late ? '1px solid #C44536' : '1px solid transparent' }}>
                    <input type="checkbox" checked={selectedExams.includes(e.exam_code)} onChange={() => toggleExam(e.exam_code)} style={{ accentColor: '#C44536' }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{e.is_late && '⚠️ '}{e.exam_name_fr}</div>
                      <div style={{ fontSize: 11, color: '#8B6F5C', marginTop: 2 }}>Recommandé à S{e.recommended_at_week}{e.is_late && ` · En retard !`}</div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedExams.length > 0 && (
                <div style={{ marginTop: 12, padding: 10, background: '#DDEBE9', borderRadius: 10, fontSize: 12, color: '#1F4341' }}>
                  ✓ <strong>{selectedExams.length}</strong> examen{selectedExams.length > 1 ? 's' : ''} sera{selectedExams.length > 1 ? 'nt' : ''} prescrit{selectedExams.length > 1 ? 's' : ''} automatiquement.
                </div>
              )}
            </FormSection>
          )}

          <FormSection number="3" title="Observations cliniques">
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={4} placeholder="Notes de la consultation..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}/>
          </FormSection>

          {error && <div style={{ marginTop: 16, padding: 14, background: '#FFE8E2', borderRadius: 12, color: '#8B2E26' }}>⚠️ {error}</div>}

          <div style={{ marginTop: 20, display: 'flex', gap: 10, marginBottom: 32 }}>
            <button type="button" onClick={() => setView({ name: 'patient', data: patientId })} style={{ flex: 1, padding: 14, background: '#F5F1EB', color: '#5D4037', borderRadius: 14, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
            <button type="submit" disabled={loading} style={{ flex: 2, ...primaryButtonStyle, opacity: loading ? 0.6 : 1 }}>{loading ? '...' : '✓ Enregistrer la CPN'}</button>
          </div>
        </form>
      </main>
    </div>
  )
}

// =====================================================
// NEW PREGNANCY (simplifié)
// =====================================================
function NewPregnancyView({ profile, patientId, setView }) {
  const [lastPeriod, setLastPeriod] = useState('')
  const [gravidity, setGravidity] = useState('1')
  const [parity, setParity] = useState('0')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const ddr = new Date(lastPeriod)
    const term = new Date(ddr); term.setDate(term.getDate() + 280)
    await supabase.from('pregnancies').insert({
      woman_id: patientId, status: 'en_cours',
      last_period_date: lastPeriod, expected_delivery_date: term.toISOString().split('T')[0],
      gravidity: parseInt(gravidity), parity: parseInt(parity),
      current_risk_level: 'faible', created_by: profile.id
    })
    setView({ name: 'patient', data: patientId })
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView({ name: 'patient', data: patientId })} style={backButtonStyle}>← Retour</button>
        <div style={{ flex: 1, marginLeft: 16, fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>+ Démarrer grossesse</div>
      </header>
      <main style={{ padding: '24px 32px', maxWidth: 720, margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <FormSection number="1" title="Informations grossesse">
            <div><label style={labelStyle}>DDR *</label><input type="date" value={lastPeriod} onChange={(e) => setLastPeriod(e.target.value)} required style={inputStyle}/></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              <div><label style={labelStyle}>Gestité</label><input type="number" min="1" value={gravidity} onChange={(e) => setGravidity(e.target.value)} style={inputStyle}/></div>
              <div><label style={labelStyle}>Parité</label><input type="number" min="0" value={parity} onChange={(e) => setParity(e.target.value)} style={inputStyle}/></div>
            </div>
          </FormSection>
          <div style={{ marginTop: 12, padding: 14, background: '#FFF6E8', borderRadius: 12, fontSize: 12, color: '#5D4037' }}>
            💡 Pour saisir les antécédents complets et obtenir le score IA, utilisez plutôt <strong>"Modifier"</strong> depuis le dossier.
          </div>
          <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, marginTop: 20 }}>{loading ? '...' : '✓ Créer la grossesse'}</button>
        </form>
      </main>
    </div>
  )
}

// =====================================================
// ALERT DETAIL
// =====================================================
function AlertDetailView({ profile, alertId, setView, openPatientDossier }) {
  const [alert, setAlert] = useState(null)
  const [woman, setWoman] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: a } = await supabase.from('alerts').select('*').eq('id', alertId).single()
      setAlert(a)
      if (a?.woman_id) {
        const { data: w } = await supabase.from('profiles').select('*').eq('id', a.woman_id).single()
        setWoman(w)
      }
      setLoading(false)
    }
    load()
  }, [alertId])

  async function resolveAlert() {
    if (!confirm('Résoudre cette alerte ?')) return
    await supabase.from('alerts').update({ status: 'resolue', resolved_at: new Date().toISOString(), resolved_by: profile.id }).eq('id', alertId)
    setView({ name: 'home' })
  }

  if (loading) return <LoadingScreen/>
  if (!alert) return <div>Alerte introuvable</div>

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView({ name: 'home' })} style={backButtonStyle}>← Retour</button>
        <div style={{ flex: 1, marginLeft: 16, fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif', color: '#8B2E26' }}>🚨 Alerte SOS</div>
        <button onClick={resolveAlert} style={{ padding: '10px 18px', background: '#2D5F5D', color: '#FAF6F0', borderRadius: 10, fontWeight: 700, border: 'none', cursor: 'pointer' }}>✓ Résoudre</button>
      </header>
      <main style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ ...cardStyle, border: '2px solid #C44536', background: 'linear-gradient(135deg, #FFE8E2 0%, #FFFFFF 100%)' }}>
          <div style={{ fontSize: 11, color: '#8B2E26', fontWeight: 700, textTransform: 'uppercase' }}>Patiente en urgence</div>
          <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', fontWeight: 700, marginTop: 6 }}>{woman?.first_name} {woman?.last_name}</div>
          <div style={{ fontSize: 12, color: '#5D4037', fontFamily: 'monospace', marginTop: 4 }}>{woman?.ipu}</div>
          <div style={{ marginTop: 16, padding: 14, background: '#FFFFFF', borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: '#8B6F5C', fontWeight: 700 }}>📍 LOCALISATION</div>
            <div style={{ fontSize: 14, fontFamily: 'monospace', marginTop: 4, fontWeight: 600 }}>{alert.latitude?.toFixed(6)}, {alert.longitude?.toFixed(6)}</div>
            <a href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 10, padding: '10px 16px', background: '#2D5F5D', color: '#FAF6F0', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>📍 Voir sur Maps</a>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button onClick={() => openPatientDossier(alert.woman_id)} style={{ flex: 1, padding: 12, background: '#C44536', color: '#FAF6F0', borderRadius: 10, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>📋 Voir le dossier</button>
            {woman?.phone && <a href={`tel:${woman.phone}`} style={{ flex: 1, padding: 12, background: '#1F4341', color: '#FAF6F0', borderRadius: 10, fontWeight: 700, textAlign: 'center', textDecoration: 'none', fontFamily: 'inherit' }}>📞 Appeler</a>}
          </div>
        </div>
      </main>
    </div>
  )
}