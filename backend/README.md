# Bank Statement Convertor Backend

Node backend to upload a bank statement PDF, optionally pass a PDF password, and download an Excel workbook in the `Book1.xlsx` style:

- Sheet name: `EXTRACT`
- Columns: `DATE`, `NARRATION`, `DR (WITHDRAWALS/PAYMENTS)`, `CR (DEPOSITS/RECEIPTS)`, `CLOSING BALANCE`
- Final row: `GRAND TOTAL` with total withdrawals, total deposits, and final closing balance

## Run Step By Step

1. Install dependencies:

   ```powershell
   npm.cmd install
   ```

2. Test normal PDF conversion:

   ```powershell
   node src/cli.js "C:\Users\HP\Downloads\502.pdf" "output\502.converted.xlsx"
   ```

3. Test password-protected PDF conversion:

   ```powershell
   node src/cli.js "C:\Users\HP\Downloads\pasprotect.bs.pdf" "output\pasprotect.converted.xlsx" "131415919"
   ```

4. Start the backend:

   ```powershell
   npm.cmd start
   ```

5. Convert through the API:

   ```powershell
   curl.exe -F "statement=@C:\Users\HP\Downloads\502.pdf" -o "output\api-502.xlsx" http://localhost:3000/api/convert
   ```

6. Convert a password-protected statement through the API:

   ```powershell
   curl.exe -F "statement=@C:\Users\HP\Downloads\pasprotect.bs.pdf" -F "password=131415919" -o "output\api-pasprotect.xlsx" http://localhost:3000/api/convert
   ```

## Additional Tested Formats

The parser has been tested with these sample layouts:

- Bank of Baroda
- HDFC Bank
- Saraswat Bank
- Kotak Mahindra Bank
- Bank of Maharashtra
- DCB Bank
- Vasai Vikas Sahakari Bank
- Axis Bank
- Bassein Catholic Co-op Bank / ODCC
- Federal Bank
- ICICI Bank
- Union Bank of India

Examples:

```powershell
node src/cli.js "C:\Users\HP\Downloads\saraswat-pws- 8898524.pdf" "output\saraswat.xlsx" "8898524"
node src/cli.js "C:\Users\HP\Downloads\9145 - PSW - 76681350.pdf" "output\kotak-9145.xlsx" "76681350"
node src/cli.js "C:\Users\HP\Downloads\FEDERAL - PSW - ADVA0101.pdf" "output\federal.xlsx" "ADVA0101"
node src/cli.js "C:\Users\HP\Downloads\UNION BANK 7112.pdf" "output\union-bank-7112.xlsx" "PATE0101"
```

## API

`POST /api/convert`

Form fields:

- `statement` or `file`: PDF file
- `password`: optional PDF password

Responses:

- Success: Excel `.xlsx` file download with one `EXTRACT` sheet
- `PASSWORD_REQUIRED`: PDF needs a password
- `INVALID_PASSWORD`: supplied password is wrong
- `NO_TRANSACTIONS_FOUND`: PDF text was read, but no transaction rows were detected
