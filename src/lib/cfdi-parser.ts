import { DocumentRecord, DocumentType, FiscalClassification } from '../types';

export interface ParsedCFDIResult {
  isValid: boolean;
  error?: string;
  document: Partial<DocumentRecord>;
  suggestedTransactionType: 'income' | 'expense' | 'neutral';
  suggestedFiscalClassification: FiscalClassification;
  explanation: string;
}

export function parseCFDIXML(xmlContent: string, currentUserId: string, userRfc?: string): ParsedCFDIResult {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      return {
        isValid: false,
        error: 'El archivo XML tiene formato inválido o está dañado.',
        document: {},
        suggestedTransactionType: 'neutral',
        suggestedFiscalClassification: 'needs_review',
        explanation: 'Error de sintaxis en el archivo XML.',
      };
    }

    // Comprobante
    let comprobanteEl = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
    if (!comprobanteEl) {
      comprobanteEl = xmlDoc.getElementsByTagName('Comprobante')[0];
    }

    if (!comprobanteEl) {
      return {
        isValid: false,
        error: 'No se encontró la estructura de Comprobante CFDI.',
        document: {},
        suggestedTransactionType: 'neutral',
        suggestedFiscalClassification: 'needs_review',
        explanation: 'El XML no contiene nodo raíz cfdi:Comprobante.',
      };
    }

    const version = comprobanteEl.getAttribute('Version') || comprobanteEl.getAttribute('version') || '4.0';
    const fecha = comprobanteEl.getAttribute('Fecha') || '';
    const tipoDeComprobante = comprobanteEl.getAttribute('TipoDeComprobante') || 'I';
    const subtotal = parseFloat(comprobanteEl.getAttribute('SubTotal') || '0');
    const descuento = parseFloat(comprobanteEl.getAttribute('Descuento') || '0');
    const total = parseFloat(comprobanteEl.getAttribute('Total') || '0');
    const moneda = comprobanteEl.getAttribute('Moneda') || 'MXN';
    const metodoPago = comprobanteEl.getAttribute('MetodoPago') || 'PUE';
    const formaPago = comprobanteEl.getAttribute('FormaPago') || '';

    // Emisor
    const emisorEl = comprobanteEl.getElementsByTagName('cfdi:Emisor')[0] || comprobanteEl.getElementsByTagName('Emisor')[0];
    const rfcEmisor = emisorEl?.getAttribute('Rfc') || emisorEl?.getAttribute('rfc') || '';
    const nombreEmisor = emisorEl?.getAttribute('Nombre') || emisorEl?.getAttribute('nombre') || rfcEmisor;

    // Receptor
    const receptorEl = comprobanteEl.getElementsByTagName('cfdi:Receptor')[0] || comprobanteEl.getElementsByTagName('Receptor')[0];
    const rfcReceptor = receptorEl?.getAttribute('Rfc') || receptorEl?.getAttribute('rfc') || '';
    const nombreReceptor = receptorEl?.getAttribute('Nombre') || receptorEl?.getAttribute('nombre') || rfcReceptor;
    const usoCFDI = receptorEl?.getAttribute('UsoCFDI') || receptorEl?.getAttribute('usoCFDI') || 'G03';

    // Timbre Fiscal Digital (UUID)
    let uuid = '';
    const timbreEl = xmlDoc.getElementsByTagName('tfd:TimbreFiscalDigital')[0] || xmlDoc.getElementsByTagName('TimbreFiscalDigital')[0];
    if (timbreEl) {
      uuid = timbreEl.getAttribute('UUID') || timbreEl.getAttribute('uuid') || '';
    }

    // Conceptos
    const conceptosEls = xmlDoc.getElementsByTagName('cfdi:Concepto').length > 0
      ? xmlDoc.getElementsByTagName('cfdi:Concepto')
      : xmlDoc.getElementsByTagName('Concepto');
    
    const descriptions: string[] = [];
    for (let i = 0; i < conceptosEls.length; i++) {
      const desc = conceptosEls[i].getAttribute('Descripcion') || conceptosEls[i].getAttribute('descripcion');
      if (desc) descriptions.push(desc.trim());
    }
    const fullDescription = descriptions.join('; ') || 'Concepto CFDI';

    // Impuestos (Traslados y Retenciones)
    let ivaTrasladado = 0;
    let isrRetenido = 0;
    let ivaRetenido = 0;

    const trasladosEls = xmlDoc.getElementsByTagName('cfdi:Traslado').length > 0
      ? xmlDoc.getElementsByTagName('cfdi:Traslado')
      : xmlDoc.getElementsByTagName('Traslado');
    
    for (let i = 0; i < trasladosEls.length; i++) {
      const imp = trasladosEls[i].getAttribute('Impuesto') || '';
      const importe = parseFloat(trasladosEls[i].getAttribute('Importe') || '0');
      if (imp === '002' || imp === 'IVA') {
        ivaTrasladado += importe;
      }
    }

    const retencionesEls = xmlDoc.getElementsByTagName('cfdi:Retencion').length > 0
      ? xmlDoc.getElementsByTagName('cfdi:Retencion')
      : xmlDoc.getElementsByTagName('Retencion');

    for (let i = 0; i < retencionesEls.length; i++) {
      const imp = retencionesEls[i].getAttribute('Impuesto') || '';
      const importe = parseFloat(retencionesEls[i].getAttribute('Importe') || '0');
      if (imp === '001' || imp === 'ISR') {
        isrRetenido += importe;
      } else if (imp === '002' || imp === 'IVA') {
        ivaRetenido += importe;
      }
    }

    // Complemento Nómina 1.2
    const nominaEl = xmlDoc.getElementsByTagName('nomina12:Nomina')[0] || xmlDoc.getElementsByTagName('Nomina')[0];
    let payrollDetails: DocumentRecord['payrollDetails'] | undefined;
    let category: DocumentType = 'invoice_received';
    let suggestedTransactionType: 'income' | 'expense' | 'neutral' = 'expense';
    let suggestedFiscalClassification: FiscalClassification = 'personal_expense';
    let explanation = '';

    const cleanUserRfc = (userRfc || '').trim().toUpperCase();
    const cleanIssuerRfc = rfcEmisor.trim().toUpperCase();
    const cleanReceiverRfc = rfcReceptor.trim().toUpperCase();

    const isIssuer = cleanUserRfc && cleanIssuerRfc === cleanUserRfc;
    const isReceiver = cleanUserRfc && cleanReceiverRfc === cleanUserRfc;

    if (nominaEl || tipoDeComprobante === 'N') {
      category = 'payroll';
      suggestedTransactionType = 'income';
      suggestedFiscalClassification = 'personal_expense'; // Sueldos y salarios

      const percepcionesEl = xmlDoc.getElementsByTagName('nomina12:Percepciones')[0] || xmlDoc.getElementsByTagName('Percepciones')[0];
      const deduccionesEl = xmlDoc.getElementsByTagName('nomina12:Deducciones')[0] || xmlDoc.getElementsByTagName('Deducciones')[0];
      const otrosPagosEl = xmlDoc.getElementsByTagName('nomina12:OtrosPagos')[0] || xmlDoc.getElementsByTagName('OtrosPagos')[0];

      const totalPercepciones = parseFloat(percepcionesEl?.getAttribute('TotalSueldos') || percepcionesEl?.getAttribute('TotalPercepciones') || String(subtotal));
      const gravadas = parseFloat(percepcionesEl?.getAttribute('TotalGravado') || '0');
      const exentas = parseFloat(percepcionesEl?.getAttribute('TotalExento') || '0');

      const totalDeducciones = parseFloat(deduccionesEl?.getAttribute('TotalDeducciones') || '0');
      const totalImpuestosRetenidos = parseFloat(deduccionesEl?.getAttribute('TotalImpuestosRetenidos') || '0');
      if (totalImpuestosRetenidos > 0) {
        isrRetenido = totalImpuestosRetenidos;
      }

      let subsidio = 0;
      if (otrosPagosEl) {
        const otrosEls = otrosPagosEl.getElementsByTagName('nomina12:OtroPago');
        for (let i = 0; i < otrosEls.length; i++) {
          const subEl = otrosEls[i].getElementsByTagName('nomina12:SubsidioAlEmpleo')[0];
          if (subEl) {
            subsidio += parseFloat(subEl.getAttribute('SubsidioCausado') || '0');
          }
        }
      }

      payrollDetails = {
        employerName: nombreEmisor,
        employerRfc: rfcEmisor,
        periodStart: nominaEl?.getAttribute('FechaInicialPago') || fecha,
        periodEnd: nominaEl?.getAttribute('FechaFinalPago') || fecha,
        paymentDate: nominaEl?.getAttribute('FechaPago') || fecha,
        daysPaid: parseFloat(nominaEl?.getAttribute('NumDiasPagados') || '15'),
        totalPerceptions: totalPercepciones,
        taxedPerceptions: gravadas,
        exemptPerceptions: exentas,
        totalDeductions: totalDeducciones,
        isrRetained: isrRetenido,
        employmentSubsidy: subsidio,
        netPaid: total,
      };

      explanation = `Recibo de nómina de ${nombreEmisor}. Sueldo bruto: $${totalPercepciones.toLocaleString('es-MX')}, ISR retenido: $${isrRetenido.toLocaleString('es-MX')}, Neto a recibir: $${total.toLocaleString('es-MX')}.`;
    } else if (tipoDeComprobante === 'P') {
      category = 'payment_complement';
      suggestedTransactionType = 'neutral';
      explanation = 'Complemento de recepción de pagos (REP). Se relaciona con el CFDI base para no duplicar el importe facturado.';
    } else if (tipoDeComprobante === 'E') {
      category = 'expense_receipt';
      suggestedTransactionType = 'expense';
      explanation = 'Nota de crédito o egreso que reduce saldos de operaciones.';
    } else if (isIssuer) {
      // El usuario es quien emitió la factura -> Ingreso
      category = 'invoice_issued';
      suggestedTransactionType = 'income';
      explanation = `Factura emitida a ${nombreReceptor}. Ingreso para tu actividad profesional o empresarial.`;
    } else {
      // El usuario recibió la factura -> Gasto
      category = 'invoice_received';
      suggestedTransactionType = 'expense';

      // Análisis fiscal del gasto
      const isPersonalDeductionUsage = [
        'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10',
      ].includes(usoCFDI);

      const isPaidByCash = formaPago === '01';

      if (isPersonalDeductionUsage) {
        if (isPaidByCash && ['D01', 'D02', 'D04', 'D08'].includes(usoCFDI)) {
          suggestedFiscalClassification = 'non_deducible';
          explanation = `Uso CFDI "${usoCFDI}" corresponde a deducción personal, pero se pagó en Efectivo (01). La ley del ISR exige pago mediante transferencia, tarjeta o cheque nominativo para ser deducible.`;
        } else {
          suggestedFiscalClassification = 'personal_deduction';
          explanation = `Posible deducción personal anual (Art. 151 LISR) con Uso CFDI ${usoCFDI} (${getUsageLabel(usoCFDI)}). Recuerda que debe cumplir los requisitos de la declaración anual.`;
        }
      } else if (['G01', 'G02', 'G03', 'I01', 'I02', 'I03', 'I04', 'I08'].includes(usoCFDI)) {
        suggestedFiscalClassification = 'business_deduction';
        explanation = `Gasto operativo con Uso CFDI ${usoCFDI} (${getUsageLabel(usoCFDI)}). Puede ser deducción autorizada si está estrictamente relacionado con tu actividad profesional o empresarial.`;
      } else {
        suggestedFiscalClassification = 'personal_expense';
        explanation = 'Gasto general registrado para tu control financiero personal.';
      }
    }

    const docRecord: Partial<DocumentRecord> = {
      userId: currentUserId,
      name: `CFDI_${rfcEmisor}_${fecha.slice(0, 10)}.xml`,
      fileType: 'xml',
      category,
      status: 'processed',
      uuid: uuid || `SAT-${Date.now()}`,
      rfcIssuer: rfcEmisor,
      nameIssuer: nombreEmisor,
      rfcReceiver: rfcReceptor,
      nameReceiver: nombreReceptor,
      issueDate: fecha,
      paymentDate: fecha,
      subtotal,
      discount: descuento,
      taxIva: ivaTrasladado,
      taxIvaRetained: ivaRetenido,
      taxIsrRetained: isrRetenido,
      total,
      currency: moneda,
      paymentMethod: metodoPago,
      paymentForm: formaPago,
      cfdiUsage: usoCFDI,
      description: fullDescription.slice(0, 450),
      suggestedCategory: getCategoryFromConcepts(fullDescription, category),
      confidence: 99,
      confidenceExplanation: 'Datos extraídos matemáticamente de la estructura oficial XML CFDI.',
      payrollDetails,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      isValid: true,
      document: docRecord,
      suggestedTransactionType,
      suggestedFiscalClassification,
      explanation,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Error al procesar el archivo XML: ${err instanceof Error ? err.message : String(err)}`,
      document: {},
      suggestedTransactionType: 'neutral',
      suggestedFiscalClassification: 'needs_review',
      explanation: 'No se pudo leer la estructura XML.',
    };
  }
}

function getUsageLabel(uso: string): string {
  const map: Record<string, string> = {
    D01: 'Honorarios médicos, dentales y gastos hospitalarios',
    D02: 'Gastos de funerales',
    D03: 'Donativos',
    D04: 'Intereses reales efectivamente pagados por créditos hipotecarios',
    D05: 'Aportaciones voluntarias al SAR / Retiro',
    D06: 'Primas por seguros de gastos médicos',
    D07: 'Gastos de transportación escolar obligatoria',
    D08: 'Pagos por servicios educativos (Colegiaturas)',
    D10: 'Pagos por servicios de salud mental o nutrición',
    G01: 'Adquisición de mercancías',
    G02: 'Devoluciones, descuentos o bonificaciones',
    G03: 'Gastos en general',
    P01: 'Por definir',
    CP01: 'Pagos',
    S01: 'Sin efectos fiscales',
  };
  return map[uso] || uso;
}

export function getCategoryFromConcepts(concept: string, docType: DocumentType): string {
  const text = concept.toLowerCase();
  if (docType === 'payroll') return 'Sueldos y Salarios';
  if (text.includes('medico') || text.includes('dental') || text.includes('honorarios medicos') || text.includes('farmacia') || text.includes('hospital') || text.includes('analisis clinico')) {
    return 'Salud y Gastos Médicos';
  }
  if (text.includes('gasolina') || text.includes('combustible') || text.includes('magna') || text.includes('premium') || text.includes('diesel')) {
    return 'Combustible y Gasolina';
  }
  if (text.includes('colegiatura') || text.includes('inscripcion') || text.includes('escuela') || text.includes('universidad')) {
    return 'Educación y Colegiaturas';
  }
  if (text.includes('restaurante') || text.includes('alimento') || text.includes('consumo') || text.includes('comida') || text.includes('cafe')) {
    return 'Alimentación y Despensa';
  }
  if (text.includes('internet') || text.includes('telefonia') || text.includes('celular') || text.includes('telmex') || text.includes('telcel') || text.includes('at&t') || text.includes('totalplay')) {
    return 'Internet y Telefonía';
  }
  if (text.includes('luz') || text.includes('cfe') || text.includes('agua') || text.includes('gas') || text.includes('mantenimiento')) {
    return 'Servicios del Hogar';
  }
  if (text.includes('software') || text.includes('computo') || text.includes('hosting') || text.includes('servidor') || text.includes('licencia') || text.includes('tecnologia')) {
    return 'Tecnología y Software';
  }
  if (text.includes('honorarios') || text.includes('asesoria') || text.includes('consultoria') || text.includes('servicios profesionales')) {
    return 'Servicios Profesionales';
  }
  if (text.includes('seguro') || text.includes('poliza') || text.includes('gnp') || text.includes('axa') || text.includes('monterrey')) {
    return 'Seguros';
  }
  if (text.includes('vuelo') || text.includes('hotel') || text.includes('hospedaje') || text.includes('transporte') || text.includes('peaje') || text.includes('caseta')) {
    return 'Transporte y Viajes';
  }
  return 'Gastos Generales';
}
