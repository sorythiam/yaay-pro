// =====================================================
// YAAY - MOTEUR IA NIVEAU 1 : SCORE DE RISQUE
// =====================================================
// Algorithme déterministe d'évaluation du risque obstétrical
// basé sur les recommandations OMS Afrique de l'Ouest et
// les facteurs de risque spécifiques au contexte sénégalais
//
// ⚠️ IMPORTANT : Cette IA SUGGÈRE, elle ne DIAGNOSTIQUE jamais.
// Le score est une aide à la décision pour la sage-femme/médecin.
// =====================================================

/**
 * Calcule le score de risque obstétrical à partir des antécédents
 *
 * @param {Object} data - Données médicales de la patiente
 * @param {boolean} data.has_hypertension - HTA personnelle
 * @param {boolean} data.has_diabetes - Diabète personnel
 * @param {boolean} data.has_previous_hemorrhage - Antécédent HPP
 * @param {boolean} data.has_previous_preeclampsia - Antécédent pré-éclampsie
 * @param {boolean} data.has_sickle_cell - Drépanocytose
 * @param {boolean} data.has_hiv - VIH
 * @param {boolean} data.has_previous_csection - Antécédent césarienne
 * @param {boolean} data.has_epilepsy - Épilepsie
 * @param {boolean} data.has_anemia - Anémie connue
 * @param {boolean} data.family_hta - HTA dans la famille
 * @param {boolean} data.family_diabetes - Diabète dans la famille
 * @param {boolean} data.family_sickle_cell - Drépanocytose dans la famille
 * @param {boolean} data.smokes - Tabagisme actif
 * @param {boolean} data.drinks_alcohol - Consommation alcool
 * @param {number|string} data.stillbirths - Nombre de mort-nés
 * @param {number|string} data.neonatal_deaths - Décès néonataux
 * @param {number|string} data.miscarriages - Fausses couches
 * @param {number} data.age - Âge maternel
 * @param {number|string} data.parity - Parité
 * @returns {Object} { score, level, label, color, factors }
 */
export function calculateRiskScore(data) {
    let score = 0
    const factors = []
  
    // ============================================================
    // CATÉGORIE 1 : ANTÉCÉDENTS PERSONNELS - HAUT POIDS
    // ============================================================
    if (data.has_hypertension) {
      score += 3
      factors.push({ label: 'HTA personnelle', weight: 3, category: 'perso' })
    }
    if (data.has_diabetes) {
      score += 3
      factors.push({ label: 'Diabète personnel', weight: 3, category: 'perso' })
    }
    if (data.has_previous_hemorrhage) {
      score += 3
      factors.push({ label: 'Antécédent HPP', weight: 3, category: 'obst' })
    }
    if (data.has_previous_preeclampsia) {
      score += 3
      factors.push({ label: 'Pré-éclampsie antérieure', weight: 3, category: 'obst' })
    }
    if (data.has_sickle_cell) {
      score += 2
      factors.push({ label: 'Drépanocytose', weight: 2, category: 'perso' })
    }
    if (data.has_hiv) {
      score += 2
      factors.push({ label: 'VIH', weight: 2, category: 'perso' })
    }
    if (data.has_previous_csection) {
      score += 1
      factors.push({ label: 'Antécédent césarienne', weight: 1, category: 'obst' })
    }
    if (data.has_epilepsy) {
      score += 2
      factors.push({ label: 'Épilepsie', weight: 2, category: 'perso' })
    }
    if (data.has_anemia) {
      score += 1
      factors.push({ label: 'Anémie connue', weight: 1, category: 'perso' })
    }
  
    // ============================================================
    // CATÉGORIE 2 : ANTÉCÉDENTS FAMILIAUX - POIDS MOYEN
    // ============================================================
    if (data.family_hta) {
      score += 1
      factors.push({ label: 'HTA familiale', weight: 1, category: 'fam' })
    }
    if (data.family_diabetes) {
      score += 1
      factors.push({ label: 'Diabète familial', weight: 1, category: 'fam' })
    }
    if (data.family_sickle_cell) {
      score += 1
      factors.push({ label: 'Drépanocytose familiale', weight: 1, category: 'fam' })
    }
  
    // ============================================================
    // CATÉGORIE 3 : MODE DE VIE - HAUT POIDS
    // ============================================================
    if (data.smokes) {
      score += 2
      factors.push({ label: 'Tabagisme', weight: 2, category: 'vie' })
    }
    if (data.drinks_alcohol) {
      score += 2
      factors.push({ label: 'Consommation alcool', weight: 2, category: 'vie' })
    }
  
    // ============================================================
    // CATÉGORIE 4 : HISTOIRE OBSTÉTRICALE
    // ============================================================
    const stillbirths = parseInt(data.stillbirths) || 0
    const neonatalDeaths = parseInt(data.neonatal_deaths) || 0
    const miscarriages = parseInt(data.miscarriages) || 0
  
    if (stillbirths > 0) {
      score += 2
      factors.push({ label: `${stillbirths} mort-né(s) antérieur(s)`, weight: 2, category: 'obst' })
    }
    if (neonatalDeaths > 0) {
      score += 2
      factors.push({ label: `${neonatalDeaths} décès néonatal`, weight: 2, category: 'obst' })
    }
    if (miscarriages >= 3) {
      score += 2
      factors.push({ label: '≥3 fausses couches', weight: 2, category: 'obst' })
    }
  
    // ============================================================
    // CATÉGORIE 5 : ÂGE MATERNEL
    // ============================================================
    if (data.age && data.age < 18) {
      score += 2
      factors.push({ label: 'Âge < 18 ans', weight: 2, category: 'age' })
    }
    if (data.age && data.age >= 35) {
      score += 1
      factors.push({ label: 'Âge ≥ 35 ans', weight: 1, category: 'age' })
    }
    if (data.age && data.age >= 40) {
      score += 2
      factors.push({ label: 'Âge ≥ 40 ans (très élevé)', weight: 2, category: 'age' })
    }
  
    // ============================================================
    // CATÉGORIE 6 : PARITÉ
    // ============================================================
    const parity = parseInt(data.parity) || 0
    if (parity === 0 && data.age >= 35) {
      score += 1
      factors.push({ label: 'Primipare âgée', weight: 1, category: 'obst' })
    }
    if (parity >= 5) {
      score += 1
      factors.push({ label: 'Grande multipare (≥5)', weight: 1, category: 'obst' })
    }
  
    // ============================================================
    // DÉTERMINATION DU NIVEAU FINAL
    // ============================================================
    let level, label, color, badge
    if (score >= 8) {
      level = 'tres_eleve'
      label = 'TRÈS ÉLEVÉ'
      color = '#C44536'
      badge = '🚨'
    } else if (score >= 4) {
      level = 'eleve'
      label = 'ÉLEVÉ'
      color = '#D4A574'
      badge = '⚠️'
    } else if (score >= 2) {
      level = 'modere'
      label = 'MODÉRÉ'
      color = '#8B6F5C'
      badge = '⚡'
    } else {
      level = 'faible'
      label = 'FAIBLE'
      color = '#2D5F5D'
      badge = '✓'
    }
  
    return { score, level, label, color, badge, factors }
  }
  
  /**
   * Obtient la recommandation textuelle en fonction du niveau de risque
   */
  export function getRiskRecommendation(level) {
    switch (level) {
      case 'tres_eleve':
        return {
          title: 'Suivi rapproché OBLIGATOIRE',
          recommendations: [
            'CPN au niveau de référence (hôpital régional ou national)',
            'Consultation gynéco-obstétricien dès que possible',
            'CPN tous les 15 jours minimum',
            'Échographie supplémentaire au T3',
            'Accouchement obligatoire en structure de niveau 2 ou 3'
          ]
        }
      case 'eleve':
        return {
          title: 'Suivi renforcé recommandé',
          recommendations: [
            'CPN au centre de santé (pas seulement au poste)',
            'CPN tous les 3 semaines au T3',
            'Bilans biologiques complémentaires',
            'Accouchement en centre de santé minimum'
          ]
        }
      case 'modere':
        return {
          title: 'Vigilance accrue',
          recommendations: [
            'CPN standard mais surveillance attentive',
            'Sensibilisation aux signes de danger',
            'Bilan complet T2 obligatoire'
          ]
        }
      default:
        return {
          title: 'Suivi standard',
          recommendations: [
            'CPN selon le calendrier OMS (4 minimum)',
            'Bilan standard à chaque trimestre',
            'Accouchement possible au poste de santé'
          ]
        }
    }
  }
  
  /**
   * Extrait les données de risque depuis un objet pregnancy de la BDD
   */
  export function extractRiskDataFromPregnancy(pregnancy, profile) {
    const age = profile?.date_of_birth
      ? Math.floor((new Date() - new Date(profile.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25))
      : null
  
    return {
      has_hypertension: pregnancy?.has_hypertension || false,
      has_diabetes: pregnancy?.has_diabetes || false,
      has_previous_hemorrhage: pregnancy?.has_previous_hemorrhage || false,
      has_previous_preeclampsia: pregnancy?.has_previous_preeclampsia || false,
      has_sickle_cell: pregnancy?.has_sickle_cell || false,
      has_hiv: pregnancy?.has_hiv || false,
      has_previous_csection: pregnancy?.has_previous_csection || false,
      has_epilepsy: pregnancy?.has_epilepsy || false,
      has_anemia: pregnancy?.has_anemia || false,
      family_hta: pregnancy?.family_hta || false,
      family_diabetes: pregnancy?.family_diabetes || false,
      family_sickle_cell: pregnancy?.family_sickle_cell || false,
      smokes: pregnancy?.smokes || false,
      drinks_alcohol: pregnancy?.drinks_alcohol || false,
      stillbirths: pregnancy?.stillbirths || 0,
      neonatal_deaths: pregnancy?.neonatal_deaths || 0,
      miscarriages: pregnancy?.miscarriages || 0,
      age,
      parity: pregnancy?.parity || 0
    }
  }