# Daily PPM — Air Compressor (ESM Shopfloor)

Web app บน **Google Apps Script** + ฐานข้อมูล **Google Sheet** สไตล์ Thai Summit ESM (Dark / Light mode)

## คุณสมบัติ

- เข้าระบบด้วย **รหัสพนักงานอย่างเดียว** (กำหนด Role ในโหมด Admin)
- 4 สิทธิ์การใช้งาน: **Operator / Engineer / Admin / Viewer**
- ฟอร์ม Daily Check 10 หัวข้อมาตรฐาน (Pressure Load/Unload, อุณหภูมิ, Oil Separator, กระแส Motor/Fan, ระดับน้ำมัน, Manual Drain, ทำความสะอาด, Running Hour) — **เพิ่ม/ลด เครื่องจักรและหัวข้อได้ในโหมด Admin**
- เกณฑ์ Min/Max ต่อหัวข้อ → ตัดสิน OK / NG อัตโนมัติ
- **Approval & Edit Workflow** โดย Engineer + **Notification บน Dashboard**
- **PDF + E-Signature** (ลายเซ็นทั้ง Operator และ Engineer) + **Audit Log**
- Dashboard สรุปสถานะรายเครื่อง รายวัน รายกะ

## ไฟล์ในโปรเจกต์

| ไฟล์ | หน้าที่ |
|---|---|
| `appsscript.json` | Manifest (timezone, web app config) |
| `Code.gs` | Config, routing (`doGet`), `setup()`, helper อ่าน/เขียน Sheet |
| `Auth.gs` | Login ด้วยรหัสพนักงาน + ตรวจสอบสิทธิ์ |
| `Data.gs` | CRUD เครื่องจักร/หัวข้อ/ผู้ใช้, submit/approve/edit, dashboard, audit |
| `Pdf.gs` | สร้าง PDF พร้อมลายเซ็น + บันทึกลง Drive |
| `Index.html` | โครงหน้าเว็บ (Login + App shell) |
| `Styles.html` | CSS ธีม Dark / Light |
| `App.html` | JavaScript ฝั่ง client (SPA) |

---

## วิธีติดตั้ง (ใช้ได้ใน 10 นาที)

### 1. สร้าง Google Sheet
1. ไปที่ [sheets.new](https://sheets.new) สร้างชีตเปล่า ตั้งชื่อเช่น **"Daily PPM AirCompressor DB"**
2. เมนู **Extensions → Apps Script** จะเปิดโปรเจกต์ Apps Script ที่ผูกกับชีตนี้

### 2. นำโค้ดเข้า
ในหน้า Apps Script:
1. ลบไฟล์ `Code.gs` ตัวอย่างที่มีมาให้ออก แล้วสร้างไฟล์ตามรายการนี้ (ปุ่ม **+ → Script / HTML**) แล้ว **คัดลอกเนื้อหาจากไฟล์ในโฟลเดอร์นี้ไปวาง**:
   - Script: `Code.gs`, `Auth.gs`, `Data.gs`, `Pdf.gs`
   - HTML: `Index.html`, `Styles.html`, `App.html`
2. เปิด **Project Settings (⚙️) → ติ๊ก "Show appsscript.json manifest file"** แล้ววางเนื้อหาจาก `appsscript.json`

> ชื่อไฟล์ต้องตรงเป๊ะ (Apps Script จะตัด `.gs`/`.html` ออกให้เอง — ตั้งชื่อ `Code`, `Index` ฯลฯ)

### 3. รัน setup() ครั้งแรก
1. ที่แถบเลือกฟังก์ชันด้านบน เลือก **`setup`** แล้วกด **Run**
2. อนุญาตสิทธิ์ (Authorize) เมื่อระบบถาม
3. ระบบจะสร้างชีตทั้งหมด (`Users`, `Machines`, `ChecklistItems`, `Records`, `AuditLog`, `Notifications`, `Settings`) พร้อม **ข้อมูลตัวอย่าง**

### 4. Deploy เป็น Web App
1. กด **Deploy → New deployment → ⚙️ เลือก Web app**
2. ตั้งค่า:
   - **Execute as:** *Me* (เจ้าของชีต)
   - **Who has access:** *Anyone* (หรือ *Anyone within [องค์กร]* ถ้าต้องการจำกัด)
3. กด **Deploy** → คัดลอก **Web app URL** ไปเปิดใช้งาน / แชร์ให้พนักงาน

---

## ผู้ใช้ตัวอย่าง (จาก setup)

| รหัส | ชื่อ | สิทธิ์ |
|---|---|---|
| `1001` | Operator A | operator |
| `1002` | Operator B | operator |
| `2001` | Engineer Som | engineer |
| `9001` | Admin Boss | admin |
| `3001` | Manager View | viewer |

> เข้าระบบครั้งแรกด้วย **9001** (Admin) เพื่อแก้ไขผู้ใช้จริง เครื่องจักรจริง และหัวข้อตรวจ

## สิทธิ์การใช้งานแต่ละ Role

| เมนู | Operator | Engineer | Admin | Viewer |
|---|:--:|:--:|:--:|:--:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Daily Check (บันทึก) | ✓ | | ✓ | |
| อนุมัติงาน | | ✓ | ✓ | |
| ประวัติการตรวจ | ✓ (เฉพาะของตน) | ✓ | ✓ | ✓ |
| Admin (ตั้งค่า) | | | ✓ | |
| Audit Log | | ✓ | ✓ | |

---

## หมายเหตุการใช้งาน

- **OK / NG:** หัวข้อชนิดตัวเลขจะ NG เมื่อค่าหลุดเกณฑ์ Min/Max; หัวข้อชนิด boolean (เช่น ทำความสะอาด, Manual Drain) NG เมื่อยังไม่ได้ทำ
- **PDF:** ปุ่ม "PDF" ดาวน์โหลดไฟล์ทันที; ถ้าเบราว์เซอร์บล็อกการดาวน์โหลดใน iframe ให้ใช้ปุ่ม **"บันทึกลง Drive"** แล้วเปิดลิงก์แทน
- **Notification:** Engineer/Admin จะได้แจ้งเตือนเมื่อมีงานส่งเข้ามา; Operator จะได้แจ้งเตือนเมื่องานถูกอนุมัติ/ตีกลับ (กระดิ่งมุมขวาบน)
- **Audit Log:** บันทึกทุกการกระทำ (login, submit, approve, reject, edit, export PDF, แก้ไข master data)
- **แก้ไขข้อมูลตัวอย่าง:** เปิดชีตโดยตรงเพื่อแก้/ลบแถวได้ หรือใช้หน้า Admin ในเว็บ

## การอัปเดตโค้ดภายหลัง
แก้ไฟล์ใน Apps Script แล้ว **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (URL เดิมจะอัปเดตอัตโนมัติ)
