<template>
  <div>
    <!-- Header -->
    <div class="card">
      <div class="card-header">ΠΡΌΤΥΠΑ ΤΙΜΕΣ & ΟΔΗΓΟΣ</div>
      <div class="card-body">
        <p class="dim">PAC στόχος ενημερώνεται αυτόματα για τη θερμοκρασία βιτρίνας που έχεις επιλέξει.</p>
        <p style="font-size:12px;color:var(--blue);margin-top:6px;">
          Λειτουργία: {{ modeLabel }} · Βιτρίνα: {{ store.displayTemp }}°C · Στόχος PAC: {{ pacT.low }}–{{ pacT.high }}
        </p>
      </div>
    </div>

    <!-- Reference bars -->
    <div class="card">
      <div class="card-header">ΕΥΡΗ ΤΙΜΩΝ — ΟΠΤΙΚΟΣ ΟΔΗΓΟΣ</div>
      <div class="card-body">
        <template v-if="!store.sorbetMode">
          <RefBarItem label="Λίπος" :track-min="0" :track-max="15" :lo="6" :hi="9" :m-lo="5" :m-hi="6" unit="%" desc="Δίνει γεμάτη γεύση και δομή. Κάτω από 6%: υδαρές. Πάνω από 9%: βαρύ και λιπαρό." />
          <RefBarItem label="MSNF (Στερεά Γάλακτος)" :track-min="0" :track-max="15" :lo="9" :hi="11" :m-lo="8" :m-hi="9" unit="%" desc="Πρωτεΐνες + λακτόζη. Δένουν τον αέρα. Πάνω από 11%: κίνδυνος κρυστάλλωσης λακτόζης." />
        </template>
        <RefBarItem label="Ολικά Στερεά (TS)" :track-min="20" :track-max="55" :lo="tsLo" :hi="tsHi" :m-lo="tsMargLo" :m-hi="tsLo" unit="%" :desc="`${modeLabel}: ${tsLo}–${tsHi}%. Χαμηλά → παγωτό σαν παγάκι. Υψηλά → κολλώδες.`" />
        <RefBarItem label="Added Sugars" :track-min="0" :track-max="45" :lo="sugLo" :hi="sugHi" unit="%" :desc="`${modeLabel}: ${sugLo}–${sugHi}%. Πάνω από το όριο: κίνδυνος μαλακής/κολλώδους υφής.`" />
        <RefBarItem label="POD (Γλυκύτητα)" :track-min="0" :track-max="30" :lo="16" :hi="22" :m-lo="14" :m-hi="16" unit="" desc="Σχετική γλυκύτητα (sucrose=100). 16–22: ισορροπημένο. Πάνω: πολύ γλυκό. Κάτω: επίπεδη γεύση." />
        <RefBarItem :label="`PAC (${store.displayTemp}°C)`" :track-min="0" :track-max="42" :lo="pacT.low" :hi="pacT.high" :m-lo="pacT.low * 0.9" :m-hi="pacT.low" unit="" :desc="`Αντιψυκτική ικανότητα για βιτρίνα ${store.displayTemp}°C. Στόχος: ${pacT.low}–${pacT.high}. Χαμηλό → σκληρό. Υψηλό → λιώνει.`" />
        <RefBarItem label="Frozen Water %" :track-min="50" :track-max="100" :lo="86" :hi="93" :m-lo="78" :m-hi="86" unit="%" desc="Ποσοστό νερού παγωμένο στη βιτρίνα. 86–93%: βελούδινο. >93%: πολύ σκληρό. <78%: κατάρρευση." />
      </div>
    </div>

    <!-- Sugar table -->
    <div class="card">
      <div class="card-header">ΣΥΝΤΕΛΕΣΤΕΣ ΣΑΚΧΑΡΩΝ</div>
      <div class="card-body" style="padding:0;">
        <table class="sugar-table">
          <thead>
            <tr>
              <th>Σάκχαρο</th>
              <th>PAC</th>
              <th>POD</th>
              <th>Σημείωση</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Σακχαρόζη (Ζάχαρη)</td><td>100</td><td>100</td><td>Βάση αναφοράς</td></tr>
            <tr><td>Δεξτρόζη</td><td>190</td><td>74</td><td>Αντιψυκτικό όπλο — PAC ↑, γλυκύτητα σταθερή</td></tr>
            <tr><td>Γλυκόζη DE38</td><td>60</td><td>40</td><td>Βελτιώνει υφή & δέσιμο</td></tr>
            <tr><td>Φρουκτόζη</td><td>190</td><td>130</td><td>Έντονη γλυκύτητα, προσοχή στο POD</td></tr>
            <tr><td>Λακτόζη</td><td>0</td><td>15</td><td>Κίνδυνος κρυστ. αν &gt;10% του νερού</td></tr>
            <tr><td>Μέλι (~80% σάκχαρα)</td><td>190</td><td>130</td><td>PAC ≈ Δεξτρόζη</td></tr>
            <tr><td>Αλκοόλ (100% αιθανόλη)</td><td>740</td><td>0</td><td>Ισχυρό αντιψυκτικό — χρησιμοποίησε με μέτρο</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pro tips -->
    <div class="card">
      <div class="card-header">PRO TIPS</div>
      <div class="card-body">
        <div class="tip-item">1. Αντικατάστησε μέρος sucrose με dextrose για μαλακότερο παγωτό χωρίς αύξηση γλυκύτητας (PAC ↑, POD σταθερό).</div>
        <div class="tip-item">2. Κράτα MSNF κάτω από 11% — η λακτόζη κρυσταλλώνεται αν ξεπεράσει το 10% του ελεύθερου νερού (αμμώδης υφή).</div>
        <div class="tip-item">3. Ολικά στερεά >40% δίνουν κολλώδη υφή. Αντικατάστησε σκόνη γάλακτος με γλυκόζη.</div>
        <div class="tip-item">4. Αλκοόλ: κάθε 10ml ρούμι 40% ABV αυξάνει δραστικά το PAC — μείωσε dextrose αντίστοιχα.</div>
        <div class="tip-item">5. Κακάο σκόνη (95% TS) ρουφά νερό — αντισταθμίστε με επιπλέον γάλα ή νερό στη συνταγή.</div>
        <div class="tip-item">6. Gelato overrun 20–35%, Sorbet 0–15%. Υψηλότερο overrun = χαμηλότερο κόστος/L αλλά πιο "αέρινο" προϊόν.</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCalculatorStore } from '../../stores/calculator.js'
import { PAC_TARGETS, SORBET_PAC_TARGETS } from '../../utils/constants.js'
import RefBarItem from '../shared/RefBarItem.vue'

const store = useCalculatorStore()

const modeLabel = computed(() => store.sorbetMode ? 'Sorbet' : 'Gelato')
const pacT = computed(() => {
  const T = store.sorbetMode ? SORBET_PAC_TARGETS : PAC_TARGETS
  return T[store.displayTemp] ?? { low: 25, high: 27 }
})
const tsLo     = computed(() => store.sorbetMode ? 28 : 36)
const tsHi     = computed(() => store.sorbetMode ? 35 : 40)
const tsMargLo = computed(() => store.sorbetMode ? 26 : 34)
const sugLo    = computed(() => store.sorbetMode ? 26 : 16)
const sugHi    = computed(() => store.sorbetMode ? 34 : 22)
</script>

<style scoped>
.sugar-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.sugar-table th { padding: 7px 10px; background: #222; color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; text-align: left; }
.sugar-table td { padding: 7px 10px; border-top: 1px solid #2a2a2a; color: #ccc; }
.sugar-table tr:hover td { background: #1e1e1e; }
.tip-item { font-size: 12px; color: #aaa; line-height: 1.6; padding: 6px 0; border-bottom: 1px solid #2a2a2a; }
.tip-item:last-child { border-bottom: none; }
</style>
