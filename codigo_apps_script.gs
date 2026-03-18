// ============================================================
//  FlotaBot — Misión Buenos Aires
//  Google Apps Script v2 — Compatible con CORS (usa GET)
//  Pegá este código en script.google.com
//  Publicar como: Web App → Cualquier persona → Implementar
// ============================================================

function doGet(e) {
  try {
    const p = e.parameter;
    const accion = p.accion || 'decision';

    if (accion === 'nuevo') {
      guardarFormulario(p);
    } else if (p.id && p.decision) {
      actualizarDecision(p.id, p.decision, p.hora || tnow());
    }

    // Respuesta con cabeceras CORS
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', msg: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function guardarFormulario(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ---- HOJA: Formularios ----
  let sh = ss.getSheetByName('Formularios');
  if (!sh) {
    sh = ss.insertSheet('Formularios');
    const headers = ['ID','Fecha','Hora','Legajo','Conductor','Gerencia','Linea',
                     'Interno','Items OK','Items con Falla','Total Items',
                     'Anomalias','Observaciones Servicio','Estado','Hora Decision'];
    sh.appendRow(headers);
    sh.getRange(1,1,1,headers.length)
      .setFontWeight('bold')
      .setBackground('#0f2642')
      .setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }

  const fallas = p.fallas ? p.fallas.split('|').filter(f => f.trim()) : [];

  sh.appendRow([
    p.id,
    p.fecha,
    p.hora,
    p.legajo,
    p.conductor,
    p.gerencia,
    p.linea,
    p.interno,
    parseInt(p.items_ok) || 0,
    fallas.length,
    parseInt(p.total_items) || 21,
    fallas.join(', '),
    p.anom,
    p.decision,
    ''  // Hora decision - se completa cuando supervisor decide
  ]);

  // ---- HOJA: Detalle Items ----
  let shItems = ss.getSheetByName('Detalle_Items');
  if (!shItems) {
    shItems = ss.insertSheet('Detalle_Items');
    const headers2 = ['ID Formulario','Fecha','Hora','Legajo','Conductor','Interno','Item','Resultado'];
    shItems.appendRow(headers2);
    shItems.getRange(1,1,1,headers2.length)
      .setFontWeight('bold')
      .setBackground('#0f2642')
      .setFontColor('#ffffff');
    shItems.setFrozenRows(1);
  }

  const itemNames = p.items_names ? p.items_names.split('|') : [];
  const resps = p.resps ? p.resps.split('') : [];

  itemNames.forEach((item, i) => {
    if (!item.trim()) return;
    const ok = resps[i] === '1';
    shItems.appendRow([
      p.id, p.fecha, p.hora, p.legajo, p.conductor, p.interno,
      item, ok ? 'OK' : 'FALLA'
    ]);
  });
}

function actualizarDecision(id, decision, hora) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Formularios');
  if (!sh) return;

  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sh.getRange(i + 1, 14).setValue(decision);
      sh.getRange(i + 1, 15).setValue(hora);
      break;
    }
  }
}

function tnow() {
  const d = new Date();
  return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}

// ---- Test manual desde el editor ----
function testGuardar() {
  const fakeParams = {
    parameter: {
      accion: 'nuevo',
      id: '#0001',
      fecha: '18/3/2026',
      hora: '10:00',
      legajo: '1083',
      conductor: 'ABREGU, SAMUEL RUBEN',
      gerencia: 'Constitucion',
      linea: '62',
      interno: '47',
      items_ok: '20',
      total_items: '21',
      fallas: 'Limpiaparabrisas',
      items_names: 'Limpiaparabrisas|Luces stop|Bocina',
      resps: '011',
      anom: 'Sin novedad',
      decision: 'Pendiente'
    }
  };
  const result = doGet(fakeParams);
  Logger.log(result.getContent());
}
