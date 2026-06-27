import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { numberToWords } from './numberToWords'; // We'll create this utility

export const generateInvoicePDF = async (project: any, invoiceData: any, settingsData: any) => {
  const invoiceDate = invoiceData?.invoiceDate || new Date().toLocaleDateString('en-IN');
  const invoiceNo = `INV-${project.id.toString().padStart(4, '0')}`;
  
  const items = invoiceData?.items || [
    { description: project.title, hsn: '', qty: 1, rate: 0, gstPercent: 0 }
  ];

  const officeName = settingsData?.officeName || 'Associated Media';
  const officeAddress = settingsData?.address || '';
  const officePhone = settingsData?.phone || '';
  const officeEmail = settingsData?.email || '';
  const officeGstin = settingsData?.gstin || '';
  const officePan = settingsData?.pan || '';
  const logoUrl = settingsData?.logoUrl || '';

  const bankAccountName = settingsData?.bankAccountName || '';
  const bankAccountNumber = settingsData?.bankAccountNumber || '';
  const bankIfsc = settingsData?.bankIfsc || '';
  const bankBranch = settingsData?.bankBranch || '';

  let totalTaxable = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0; // Assuming same state for now, so CGST/SGST. If needed, can be expanded.
  let grandTotal = 0;

  const itemRows = items.map((item: any, index: number) => {
    const amount = item.qty * item.rate;
    const gstAmount = amount * (item.gstPercent / 100);
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;
    const total = amount + gstAmount;

    totalTaxable += amount;
    totalCGST += cgst;
    totalSGST += sgst;
    grandTotal += total;

    return `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td>${item.description}</td>
        <td class="text-center">${item.hsn || '-'}</td>
        <td class="text-center">${item.qty}</td>
        <td class="text-right">${item.rate.toFixed(2)}</td>
        <td class="text-right">${amount.toFixed(2)}</td>
        <td class="text-right">${(item.gstPercent/2).toFixed(1)}%<br>${cgst.toFixed(2)}</td>
        <td class="text-right">${(item.gstPercent/2).toFixed(1)}%<br>${sgst.toFixed(2)}</td>
        <td class="text-right">${total.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const amountInWords = numberToWords(Math.round(grandTotal));

  const htmlContent = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { margin: 20px; }
          body { font-family: 'Helvetica', sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; }
          .container { border: 1px solid #000; padding: 0; margin: 0 auto; width: 100%; max-width: 800px; box-sizing: border-box; }
          
          .header { display: flex; border-bottom: 1px solid #000; }
          .header-left { width: 60%; padding: 15px; border-right: 1px solid #000; }
          .header-right { width: 40%; padding: 15px; }
          
          .logo { max-width: 150px; max-height: 60px; margin-bottom: 10px; }
          .office-name { font-size: 18px; font-weight: bold; margin: 0 0 5px 0; color: #B31B1B; } /* Dark Red */
          .office-details { font-size: 11px; margin: 0; line-height: 1.4; }
          
          .invoice-title { font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 15px; text-transform: uppercase; }
          .invoice-meta-table { width: 100%; font-size: 11px; border-collapse: collapse; }
          .invoice-meta-table td { padding: 3px 0; }
          .meta-label { font-weight: bold; width: 40%; }
          
          .bill-to-section { display: flex; border-bottom: 1px solid #000; }
          .bill-to-box { width: 100%; padding: 10px 15px; }
          .bill-to-title { font-weight: bold; font-size: 12px; margin-bottom: 5px; text-decoration: underline; }
          
          table.items-table { width: 100%; border-collapse: collapse; }
          table.items-table th { border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 10px; }
          table.items-table td { border-right: 1px solid #000; border-left: 1px solid #000; padding: 6px; font-size: 11px; vertical-align: top; }
          table.items-table tbody tr:last-child td { border-bottom: 1px solid #000; }
          table.items-table .text-center { text-align: center; }
          table.items-table .text-right { text-align: right; }
          
          .summary-section { display: flex; border-bottom: 1px solid #000; }
          .amount-words { width: 65%; padding: 10px 15px; border-right: 1px solid #000; }
          .amount-words-title { font-weight: bold; font-style: italic; margin-bottom: 5px; }
          .totals-box { width: 35%; padding: 0; }
          
          .totals-table { width: 100%; border-collapse: collapse; }
          .totals-table td { padding: 4px 10px; border-bottom: 1px solid #000; font-size: 11px; }
          .totals-table tr:last-child td { border-bottom: none; font-weight: bold; font-size: 13px; background-color: #f0f0f0; }
          
          .footer-section { display: flex; }
          .bank-details { width: 60%; padding: 10px 15px; border-right: 1px solid #000; }
          .bank-title { font-weight: bold; text-decoration: underline; margin-bottom: 5px; }
          .bank-table { font-size: 11px; }
          .bank-table td { padding: 2px 5px 2px 0; }
          
          .auth-sign { width: 40%; padding: 10px 15px; text-align: right; display: flex; flex-direction: column; justify-content: space-between; }
          .auth-name { font-weight: bold; margin-bottom: 40px; }
          
          .terms { font-size: 9px; padding: 10px 15px; border-top: 1px solid #000; }
          
        </style>
      </head>
      <body>
        <h2 style="text-align: center; margin: 0 0 10px 0; font-size: 18px;">TAX INVOICE</h2>
        <div class="container">
          
          <div class="header">
            <div class="header-left">
              ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
              <h1 class="office-name">${officeName}</h1>
              <p class="office-details">
                ${officeAddress ? officeAddress.replace(/\\n/g, '<br>') + '<br>' : ''}
                ${officePhone ? `<b>Phone:</b> ${officePhone}<br>` : ''}
                ${officeEmail ? `<b>Email:</b> ${officeEmail}<br>` : ''}
                ${officeGstin ? `<b>GSTIN:</b> ${officeGstin}<br>` : ''}
                ${officePan ? `<b>PAN:</b> ${officePan}` : ''}
              </p>
            </div>
            <div class="header-right">
              <table class="invoice-meta-table">
                <tr><td class="meta-label">Invoice No.</td><td>: <b>${invoiceNo}</b></td></tr>
                <tr><td class="meta-label">Date</td><td>: <b>${invoiceDate}</b></td></tr>
                <tr><td class="meta-label">State</td><td>: Jammu and Kashmir</td></tr>
                <tr><td class="meta-label">State Code</td><td>: 01</td></tr>
              </table>
            </div>
          </div>
          
          <div class="bill-to-section">
            <div class="bill-to-box">
              <div class="bill-to-title">Billed To:</div>
              <div style="font-weight: bold; font-size: 13px;">${invoiceData?.billToName || '-'}</div>
              <div style="margin-top: 5px;">${invoiceData?.billToAddress ? invoiceData.billToAddress.replace(/\\n/g, '<br>') : ''}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th width="5%">S.No</th>
                <th width="35%">Description of Goods / Services</th>
                <th width="10%">HSN/SAC</th>
                <th width="5%">Qty</th>
                <th width="10%">Rate</th>
                <th width="10%">Taxable Val</th>
                <th width="10%">CGST</th>
                <th width="10%">SGST</th>
                <th width="15%">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              <!-- Empty rows to push totals down if needed -->
              <tr><td style="height: 50px;"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            </tbody>
          </table>

          <div class="summary-section">
            <div class="amount-words">
              <div class="amount-words-title">Amount in Words:</div>
              <div>Rupees ${amountInWords} Only</div>
            </div>
            <div class="totals-box">
              <table class="totals-table">
                <tr>
                  <td>Total Taxable Value</td>
                  <td class="text-right">₹ ${totalTaxable.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Total CGST</td>
                  <td class="text-right">₹ ${totalCGST.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Total SGST</td>
                  <td class="text-right">₹ ${totalSGST.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Round Off</td>
                  <td class="text-right">₹ ${(Math.round(grandTotal) - grandTotal).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Grand Total</td>
                  <td class="text-right">₹ ${Math.round(grandTotal).toFixed(2)}</td>
                </tr>
              </table>
            </div>
          </div>

          <div class="footer-section">
            <div class="bank-details">
              <div class="bank-title">Bank Details</div>
              <table class="bank-table">
                <tr><td><b>Account Name</b></td><td>: ${bankAccountName}</td></tr>
                <tr><td><b>Account Number</b></td><td>: ${bankAccountNumber}</td></tr>
                <tr><td><b>IFSC Code</b></td><td>: ${bankIfsc}</td></tr>
                <tr><td><b>Branch</b></td><td>: ${bankBranch}</td></tr>
              </table>
            </div>
            <div class="auth-sign">
              <div class="auth-name">For ${officeName}</div>
              <div>Authorized Signatory</div>
            </div>
          </div>
          
          <div class="terms">
            <b>Terms & Conditions:</b>
            1. Goods once sold will not be taken back.<br>
            2. Interest @ 18% p.a. will be charged if payment is delayed.
          </div>

        </div>
      </body>
    </html>
  `;

  try {
    if (Platform.OS === 'web') {
      // On web, generating a silent PDF buffer is not supported natively by expo-print
      // The officially supported and correct way is to use printAsync which opens the 
      // browser's Print dialog where the user can choose "Save as PDF".
      await Print.printAsync({ html: htmlContent });
    } else {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      console.log('File has been saved to:', uri);
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF invoice.');
  }
};
