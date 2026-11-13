const PIX_GUI = 'br.gov.bcb.pix';

export const PIX_KEY = '07056837964';
export const PIX_RECEIVER_NAME = 'TAIANE';
export const PIX_RECEIVER_CITY = 'JOINVILLE';

function campoPix(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

function calcularCrc16(text: string) {
  let crc = 0xffff;

  for (let index = 0; index < text.length; index += 1) {
    crc ^= text.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function criarPayloadPix(valor: number) {
  const contaPix = campoPix('00', PIX_GUI) + campoPix('01', PIX_KEY);
  const dadosAdicionais = campoPix('05', '***');
  const payload = [
    campoPix('00', '01'),
    campoPix('26', contaPix),
    campoPix('52', '0000'),
    campoPix('53', '986'),
    campoPix('54', valor.toFixed(2)),
    campoPix('58', 'BR'),
    campoPix('59', PIX_RECEIVER_NAME),
    campoPix('60', PIX_RECEIVER_CITY),
    campoPix('62', dadosAdicionais),
  ].join('');
  const payloadComCampoCrc = `${payload}6304`;

  return `${payloadComCampoCrc}${calcularCrc16(payloadComCampoCrc)}`;
}
