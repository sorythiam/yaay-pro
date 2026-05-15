// =====================================================
// YAAY - COMPOSANTS MÉDICAMENTS & ORDONNANCES
// Fichier partagé : utilisé par Yaay Pro ET App Femme
// Placer dans src/MedicationsComponents.js des 2 apps
// =====================================================

import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

// =====================================================
// COULEURS (reprises de l'app)
// =====================================================
const COLORS = {
  red: '#C44536', teal: '#2D5F5D', dark: '#2A1810', gray: '#8B6F5C',
  gold: '#D4A574', cream: '#FAF6F0', lightGray: '#F5F1EB', white: '#FFFFFF'
}

// =====================================================
// HOOK : charger les médicaments d'une patiente
// =====================================================
export function useMedications(womanId, pregnancyId) {
  const [medications, setMedications] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!womanId) return
    const { data: meds } = await supabase
      .from('medications')
      .select('*')
      .eq('woman_id', womanId)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })
    setMedications(meds || [])

    const { data: cat } = await supabase.from('medication_catalog').select('*').order('category').order('name')
    setCatalog(cat || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [womanId])

  const activeMeds = medications.filter(m => m.is_active)
  const stoppedMeds = medications.filter(m => !m.is_active)
  const selfDeclared = activeMeds.filter(m => m.source === 'auto_declaration')
  const prescribed = activeMeds.filter(m => m.source !== 'auto_declaration')
  const warnings = activeMeds.filter(m => m.pregnancy_safe === 'non' || m.interaction_warning)

  return { medications, activeMeds, stoppedMeds, selfDeclared, prescribed, warnings, catalog, loading, reload: load }
}

// =====================================================
// VUE SAGE-FEMME : Liste complète + prescrire
// (Pour Yaay Pro — onglet dans PatientFileView)
// =====================================================
export function ProMedicationsTab({ patientId, pregnancyId, profile, onChange }) {
  const { activeMeds, stoppedMeds, selfDeclared, prescribed, warnings, catalog, loading, reload } = useMedications(patientId, pregnancyId)
  const [showPrescribe, setShowPrescribe] = useState(false)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: COLORS.gray }}>Chargement...</div>

  return (
    <div>
      {/* ALERTE INTERACTIONS */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: 16, padding: 16, background: '#FFE8E2', border: '2px solid #C44536', borderRadius: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#8B2E26' }}>{warnings.length} alerte{warnings.length > 1 ? 's' : ''} médicament{warnings.length > 1 ? 's' : ''}</div>
            <div style={{ fontSize: 12, color: '#5D4037', marginTop: 4 }}>
              {warnings.map(w => w.name).join(', ')} — Vérifiez la compatibilité grossesse.
            </div>
          </div>
        </div>
      )}

      {/* BOUTON PRESCRIRE */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowPrescribe(true)} style={{ padding: '10px 18px', background: `linear-gradient(135deg, ${COLORS.red} 0%, #8B2E26 100%)`, color: COLORS.cream, borderRadius: 12, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          ➕ Prescrire un médicament
        </button>
      </div>

      {/* RÉSUMÉ RAPIDE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <MiniStat label="Prescriptions actives" value={prescribed.length} color={COLORS.teal}/>
        <MiniStat label="Auto-déclarés" value={selfDeclared.length} color={COLORS.gold}/>
        <MiniStat label="Alertes" value={warnings.length} color={warnings.length > 0 ? COLORS.red : COLORS.teal}/>
      </div>

      {/* AUTO-DÉCLARATIONS (ce que la patiente prend de son côté) */}
      {selfDeclared.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16, borderLeft: `4px solid ${COLORS.gold}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.gold, marginBottom: 12 }}>
            📋 Traitements auto-déclarés par la patiente ({selfDeclared.length})
          </div>
          <div style={{ fontSize: 11, color: COLORS.gray, marginBottom: 12, fontStyle: 'italic' }}>
            ⚠️ Ces médicaments sont déclarés par la patiente. Vérifiez la compatibilité avec la grossesse.
          </div>
          {selfDeclared.map(m => <MedCard key={m.id} med={m} showSource={false}/>)}
        </div>
      )}

      {/* PRESCRIPTIONS PAR LES PROS */}
      {prescribed.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16, borderLeft: `4px solid ${COLORS.teal}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.teal, marginBottom: 12 }}>
            🩺 Prescriptions ({prescribed.length})
          </div>
          {prescribed.map(m => <MedCard key={m.id} med={m} showSource={true}/>)}
        </div>
      )}

      {activeMeds.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 50, marginBottom: 12 }}>💊</div>
          <div style={{ fontSize: 14, color: COLORS.gray }}>Aucun médicament enregistré</div>
        </div>
      )}

      {/* ANCIENS TRAITEMENTS */}
      {stoppedMeds.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16, opacity: 0.7 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.gray, marginBottom: 12 }}>
            📦 Traitements arrêtés ({stoppedMeds.length})
          </div>
          {stoppedMeds.map(m => <MedCard key={m.id} med={m} showSource={true} stopped={true}/>)}
        </div>
      )}

      {/* MODAL PRESCRIRE */}
      {showPrescribe && (
        <PrescribeModal
          patientId={patientId}
          pregnancyId={pregnancyId}
          profile={profile}
          catalog={catalog}
          onClose={() => setShowPrescribe(false)}
          onSaved={() => { setShowPrescribe(false); reload(); if (onChange) onChange() }}
        />
      )}
    </div>
  )
}

// =====================================================
// VUE PATIENTE : Mes médicaments + auto-déclaration
// (Pour App Femme)
// =====================================================
export function FemmeMedicationsView({ profile, pregnancy, tr }) {
  const { activeMeds, selfDeclared, prescribed, warnings, catalog, loading, reload } = useMedications(profile.id, pregnancy?.id)
  const [showAddMed, setShowAddMed] = useState(false)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: COLORS.gray }}>Chargement...</div>

  return (
    <div style={{ padding: '20px 18px 100px' }}>
      <div style={{ fontSize: 11, color: COLORS.gray, fontWeight: 600, textTransform: 'uppercase' }}>Mes médicaments</div>
      <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 600, color: COLORS.dark, marginTop: 2 }}>
        Ordonnances & traitements
      </div>

      {/* ALERTE */}
      {warnings.length > 0 && (
        <div style={{ marginTop: 14, padding: 14, background: '#FFE8E2', border: '2px solid #C44536', borderRadius: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8B2E26' }}>⚠️ Attention : {warnings.length} médicament{warnings.length > 1 ? 's' : ''} à vérifier</div>
          <div style={{ fontSize: 11, color: '#5D4037', marginTop: 4 }}>Parlez-en à votre sage-femme lors de votre prochaine CPN.</div>
        </div>
      )}

      {/* BOUTON AJOUTER */}
      <button onClick={() => setShowAddMed(true)} style={{ marginTop: 14, width: '100%', padding: 14, background: COLORS.white, border: `2px dashed ${COLORS.gold}`, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>💊</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.dark }}>Ajouter un médicament</div>
          <div style={{ fontSize: 11, color: COLORS.gray }}>Traitements prescrits par vos autres médecins</div>
        </div>
      </button>

      {/* PRESCRIPTIONS DE LA SAGE-FEMME */}
      {prescribed.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.teal, marginBottom: 10 }}>🩺 Prescrits par votre sage-femme ({prescribed.length})</div>
          {prescribed.map(m => <MedCardMobile key={m.id} med={m}/>)}
        </div>
      )}

      {/* MES TRAITEMENTS DÉCLARÉS */}
      {selfDeclared.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.gold, marginBottom: 10 }}>💊 Mes autres traitements ({selfDeclared.length})</div>
          {selfDeclared.map(m => <MedCardMobile key={m.id} med={m} canStop={true} onStop={async () => {
            await supabase.from('medications').update({ is_active: false, stopped_at: new Date().toISOString(), stopped_reason: 'Arrêté par la patiente' }).eq('id', m.id)
            reload()
          }}/>)}
        </div>
      )}

      {activeMeds.length === 0 && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 50, marginBottom: 12 }}>💊</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.gray }}>Aucun médicament</div>
          <div style={{ fontSize: 12, color: '#B8A89A', marginTop: 6 }}>Ajoutez vos traitements pour que votre sage-femme ait une vue complète.</div>
        </div>
      )}

      {/* MODAL AJOUTER */}
      {showAddMed && (
        <AddMedicationModal
          profile={profile}
          pregnancyId={pregnancy?.id}
          catalog={catalog}
          onClose={() => setShowAddMed(false)}
          onSaved={() => { setShowAddMed(false); reload() }}
        />
      )}
    </div>
  )
}

// =====================================================
// COMPOSANTS PARTAGÉS
// =====================================================

function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: `${color}15`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: COLORS.gray, fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function MedCard({ med, showSource = true, stopped = false }) {
  const safeColor = med.pregnancy_safe === 'oui' ? COLORS.teal : med.pregnancy_safe === 'non' ? COLORS.red : COLORS.gold
  const safeLabel = med.pregnancy_safe === 'oui' ? '✓ Compatible grossesse' : med.pregnancy_safe === 'non' ? '⚠ CONTRE-INDIQUÉ' : '⚡ Surveillance'

  return (
    <div style={{ padding: 12, background: stopped ? '#F5F1EB' : COLORS.cream, borderRadius: 10, border: `1px solid ${med.pregnancy_safe === 'non' ? COLORS.red : 'rgba(42,24,16,0.06)'}`, marginBottom: 8, opacity: stopped ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.dark }}>{med.name}</div>
          <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
            {med.dosage && `${med.dosage} · `}{med.frequency || ''}
          </div>
        </div>
        <span style={{ padding: '3px 8px', background: `${safeColor}20`, color: safeColor, borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{safeLabel}</span>
      </div>
      {med.instructions && <div style={{ marginTop: 6, fontSize: 11, color: COLORS.gray, fontStyle: 'italic' }}>💡 {med.instructions}</div>}
      {med.interaction_warning && <div style={{ marginTop: 6, padding: 8, background: '#FFE8E2', borderRadius: 6, fontSize: 11, color: '#8B2E26' }}>⚠️ {med.interaction_warning}</div>}
      {showSource && (
        <div style={{ marginTop: 8, fontSize: 10, color: '#B8A89A' }}>
          {med.source === 'auto_declaration' ? `📱 Auto-déclaré${med.prescriber_name ? ` · Prescrit par ${med.prescriber_name}` : ''}` :
           `🩺 Prescrit via Yaay${med.prescriber_specialty ? ` · ${med.prescriber_specialty}` : ''}`}
          {med.start_date && ` · Depuis ${new Date(med.start_date).toLocaleDateString('fr-FR')}`}
        </div>
      )}
      {stopped && med.stopped_reason && <div style={{ marginTop: 6, fontSize: 10, color: COLORS.red }}>Arrêté : {med.stopped_reason}</div>}
    </div>
  )
}

function MedCardMobile({ med, canStop, onStop }) {
  const safeColor = med.pregnancy_safe === 'oui' ? COLORS.teal : med.pregnancy_safe === 'non' ? COLORS.red : COLORS.gold

  return (
    <div style={{ padding: 14, background: COLORS.white, borderRadius: 14, border: med.pregnancy_safe === 'non' ? `2px solid ${COLORS.red}` : '1px solid rgba(42,24,16,0.04)', marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${safeColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>💊</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.dark }}>{med.name}</div>
          <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
            {med.dosage && `${med.dosage} · `}{med.frequency || 'Posologie non précisée'}
          </div>
          {med.instructions && <div style={{ marginTop: 4, fontSize: 11, color: COLORS.gray, fontStyle: 'italic' }}>💡 {med.instructions}</div>}
          {med.prescriber_name && <div style={{ marginTop: 4, fontSize: 11, color: '#B8A89A' }}>Prescrit par {med.prescriber_name}</div>}
          {med.interaction_warning && <div style={{ marginTop: 6, padding: 8, background: '#FFE8E2', borderRadius: 8, fontSize: 11, color: '#8B2E26' }}>⚠️ {med.interaction_warning}</div>}
        </div>
      </div>
      {canStop && (
        <button onClick={() => { if (confirm('Arrêter ce traitement ?')) onStop() }} style={{ marginTop: 10, width: '100%', padding: 8, background: COLORS.lightGray, color: COLORS.gray, border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          ✕ J'ai arrêté ce traitement
        </button>
      )}
    </div>
  )
}

// =====================================================
// MODAL PRESCRIRE (Sage-femme)
// =====================================================
function PrescribeModal({ patientId, pregnancyId, profile, catalog, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [duration, setDuration] = useState('')
  const [instructions, setInstructions] = useState('')
  const [pregnancySafe, setPregnancySafe] = useState('oui')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const filteredCatalog = search.length >= 2
    ? catalog.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()))
    : []

  function selectFromCatalog(item) {
    setName(item.name)
    setDosage(item.default_dosage || '')
    setFrequency(item.default_frequency || '')
    setPregnancySafe(item.pregnancy_safe || 'oui')
    if (item.notes) setInstructions(item.notes)
    setSearch('')
  }

  async function handleSave() {
    if (!name.trim()) return alert('Nom du médicament requis')
    setLoading(true)
    try {
      await supabase.from('medications').insert({
        woman_id: patientId, pregnancy_id: pregnancyId,
        name: name.trim(), dosage, frequency, duration, instructions,
        source: profile.role === 'sage_femme' ? 'sage_femme' : 'medecin',
        prescribed_by: profile.id,
        prescriber_specialty: profile.role === 'sage_femme' ? 'Sage-femme' : 'Médecin',
        pregnancy_safe: pregnancySafe,
        is_active: true, start_date: new Date().toISOString().split('T')[0]
      })
      // Notification à la patiente
      await supabase.from('notifications').insert({
        woman_id: patientId, type: 'general',
        title: '💊 Nouveau médicament prescrit',
        message: `${profile.first_name} ${profile.last_name} vous a prescrit "${name.trim()}"${dosage ? ` (${dosage})` : ''}.`,
        created_by: profile.id
      })
      onSaved()
    } catch (err) { alert('Erreur: ' + err.message); setLoading(false) }
  }

  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.gray, fontWeight: 700, textTransform: 'uppercase' }}>Prescrire un médicament</div>
            <div style={{ fontSize: 20, fontFamily: 'Georgia, serif', fontWeight: 700, marginTop: 4, color: COLORS.dark }}>Nouvelle ordonnance</div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Recherche dans le catalogue */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>🔍 Rechercher dans le catalogue (optionnel)</label>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tapez un nom de médicament..." style={inputStyle}/>
          {filteredCatalog.length > 0 && (
            <div style={{ marginTop: 6, maxHeight: 160, overflowY: 'auto', background: COLORS.white, borderRadius: 10, border: '1px solid rgba(42,24,16,0.08)' }}>
              {filteredCatalog.map(c => (
                <button key={c.id} onClick={() => selectFromCatalog(c)} style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', borderBottom: '1px solid rgba(42,24,16,0.04)', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: COLORS.gray }}>{c.category} · {c.default_dosage} · {c.pregnancy_safe === 'oui' ? '✓ Compatible' : c.pregnancy_safe === 'non' ? '⚠ Contre-indiqué' : '⚡ Surveillance'}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Nom du médicament *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Fer Foldine" required style={inputStyle}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <div>
            <label style={labelStyle}>Dosage</label>
            <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Ex: 500mg" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Fréquence</label>
            <input type="text" value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="Ex: 2x/jour" style={inputStyle}/>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <div>
            <label style={labelStyle}>Durée</label>
            <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ex: 30 jours" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Compatibilité grossesse</label>
            <select value={pregnancySafe} onChange={(e) => setPregnancySafe(e.target.value)} style={inputStyle}>
              <option value="oui">✓ Compatible</option>
              <option value="sous_surveillance">⚡ Sous surveillance</option>
              <option value="non">⚠ Contre-indiqué</option>
              <option value="inconnu">? Inconnu</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Instructions</label>
          <input type="text" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Ex: Prendre pendant le repas" style={inputStyle}/>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, background: COLORS.lightGray, color: COLORS.gray, borderRadius: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          <button onClick={handleSave} disabled={loading || !name.trim()} style={{ flex: 2, padding: 12, background: `linear-gradient(135deg, ${COLORS.red} 0%, #8B2E26 100%)`, color: COLORS.cream, borderRadius: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: loading || !name.trim() ? 0.6 : 1 }}>
            {loading ? '...' : '💊 Prescrire'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL AUTO-DÉCLARATION (Patiente)
// =====================================================
function AddMedicationModal({ profile, pregnancyId, catalog, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [prescriberName, setPrescriberName] = useState('')
  const [prescriberSpecialty, setPrescriberSpecialty] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const filteredCatalog = search.length >= 2
    ? catalog.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : []

  function selectFromCatalog(item) {
    setName(item.name)
    setDosage(item.default_dosage || '')
    setFrequency(item.default_frequency || '')
    setSearch('')
  }

  async function handleSave() {
    if (!name.trim()) return alert('Indiquez le nom du médicament')
    setLoading(true)
    try {
      await supabase.from('medications').insert({
        woman_id: profile.id, pregnancy_id: pregnancyId,
        name: name.trim(), dosage, frequency,
        source: 'auto_declaration',
        prescriber_name: prescriberName || null,
        prescriber_specialty: prescriberSpecialty || null,
        pregnancy_safe: 'inconnu',
        is_active: true, start_date: new Date().toISOString().split('T')[0]
      })
      onSaved()
    } catch (err) { alert('Erreur: ' + err.message); setLoading(false) }
  }

  const specialties = ['Généraliste', 'Cardiologue', 'Diabétologue / Endocrinologue', 'Gynécologue', 'Dermatologue', 'Psychiatre', 'Pneumologue', 'Hématologue (drépanocytose)', 'Autre']

  return (
    <div style={modalOverlay}>
      <div style={{ ...modalContent, maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontFamily: 'Georgia, serif', fontWeight: 700, color: COLORS.dark }}>💊 Ajouter un médicament</div>
            <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>Indiquez les traitements que vous prenez</div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ padding: 12, background: '#FFF6E8', borderRadius: 10, marginBottom: 16, fontSize: 12, color: '#5D4037', lineHeight: 1.5 }}>
          💡 <strong>Pourquoi c'est important ?</strong> Votre sage-femme doit connaître TOUS vos traitements pour éviter les interactions dangereuses pendant la grossesse.
        </div>

        {/* Recherche catalogue */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>🔍 Chercher un médicament</label>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tapez le nom..." style={inputStyle}/>
          {filteredCatalog.length > 0 && (
            <div style={{ marginTop: 6, maxHeight: 140, overflowY: 'auto', background: COLORS.white, borderRadius: 10, border: '1px solid rgba(42,24,16,0.08)' }}>
              {filteredCatalog.map(c => (
                <button key={c.id} onClick={() => selectFromCatalog(c)} style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', borderBottom: '1px solid rgba(42,24,16,0.04)', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: COLORS.gray }}>{c.default_dosage}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Nom du médicament *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Amlodipine, Metformine..." style={inputStyle}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <div>
            <label style={labelStyle}>Dosage</label>
            <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Ex: 10mg" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Fréquence</label>
            <input type="text" value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="Ex: 1x/jour" style={inputStyle}/>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Prescrit par qui ?</label>
          <input type="text" value={prescriberName} onChange={(e) => setPrescriberName(e.target.value)} placeholder="Ex: Dr Diallo" style={inputStyle}/>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Spécialité du médecin</label>
          <select value={prescriberSpecialty} onChange={(e) => setPrescriberSpecialty(e.target.value)} style={inputStyle}>
            <option value="">— Choisir —</option>
            {specialties.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, background: COLORS.lightGray, color: COLORS.gray, borderRadius: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          <button onClick={handleSave} disabled={loading || !name.trim()} style={{ flex: 2, padding: 12, background: `linear-gradient(135deg, ${COLORS.teal} 0%, #1F4341 100%)`, color: COLORS.cream, borderRadius: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: loading || !name.trim() ? 0.6 : 1 }}>
            {loading ? '...' : '✓ Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// STYLES
// =====================================================
const cardStyle = { background: '#FFFFFF', borderRadius: 18, padding: 20, border: '1px solid rgba(42,24,16,0.04)' }
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }
const modalContent = { background: COLORS.cream, borderRadius: 18, padding: 24, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }
const closeBtn = { padding: 8, background: COLORS.lightGray, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }
const labelStyle = { fontSize: 11, color: COLORS.gray, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }
const inputStyle = { width: '100%', padding: '11px 14px', fontSize: 14, fontWeight: 500, color: COLORS.dark, background: COLORS.white, border: '2px solid rgba(42,24,16,0.08)', borderRadius: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }