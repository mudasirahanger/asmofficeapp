export const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const regex = /^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/;
  
  const strNum = ('000000000' + num).slice(-9);
  const match = strNum.match(regex);
  if (!match) return '';

  let str = '';
  str += (parseInt(match[1]) !== 0) ? (a[parseInt(match[1])] || b[match[1][0] as any] + ' ' + a[match[1][1] as any]) + 'Crore ' : '';
  str += (parseInt(match[2]) !== 0) ? (a[parseInt(match[2])] || b[match[2][0] as any] + ' ' + a[match[2][1] as any]) + 'Lakh ' : '';
  str += (parseInt(match[3]) !== 0) ? (a[parseInt(match[3])] || b[match[3][0] as any] + ' ' + a[match[3][1] as any]) + 'Thousand ' : '';
  str += (parseInt(match[4]) !== 0) ? (a[parseInt(match[4])] || b[match[4][0] as any] + ' ' + a[match[4][1] as any]) + 'Hundred ' : '';
  str += (parseInt(match[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[parseInt(match[5])] || b[match[5][0] as any] + ' ' + a[match[5][1] as any]) : '';

  return str.trim();
};
