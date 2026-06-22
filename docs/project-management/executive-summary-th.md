# สรุปโปรเจค AKRA WEBAPP V2 สำหรับนำเสนอผู้บริหาร

Last updated: 2026-06-22

## 1. ภาพรวมสั้น ๆ

AKRA WEBAPP V2 คือโปรเจคสร้างระบบกลางใหม่ เพื่อรวมระบบเดิมหลายตัวที่กระจายอยู่ใน HTML, Google Apps Script, Google Sheets และ GitHub Pages ให้มาอยู่ในเว็บแอปเดียวแบบแยกโมดูลชัดเจน

แนวทางหลักคือย้ายทีละโมดูล ไม่เปลี่ยนระบบ V1 ที่ใช้งานจริงทันที จนกว่าแต่ละโมดูลใน V2 จะทดสอบครบและได้รับอนุมัติให้ cutover

สถานะตอนนี้: V2 อยู่ในช่วง Phase 3 หรือช่วงทำโมดูลนำร่อง โดยใช้ Picking เป็นโมดูลแรก งานหลักของ Main portal และ Picking หลายส่วนทดสอบผ่านบน staging แล้ว แต่ยังไม่ถือว่าแทนระบบ production V1 ได้ทั้งหมด

## 2. Stack ที่ใช้

- Frontend / Web app: Next.js, React, TypeScript
- Runtime และเครื่องมือพัฒนา: Node.js, npm
- Hosting: Vercel
- Database: Supabase Postgres
- Login และสิทธิ์ผู้ใช้: Supabase Auth + role/permission ในฐานข้อมูล
- Backend logic: Next.js server-side code, Server Actions และ Supabase RPC
- Migration / database change: SQL migrations ใต้ `supabase/migrations`
- Notification ที่วางไว้: LINE notification ฝั่ง server เท่านั้น ไม่เก็บ secret ใน browser

สรุปแบบภาษาคน: โปรเจคนี้เป็นเว็บแอป Next.js ที่ใช้ Supabase เป็นฐานข้อมูลและระบบ login แล้ว deploy ผ่าน Vercel

## 3. โปรเจคนี้มีอะไรบ้าง

### Main / Core

- หน้า portal หลักของระบบ V2
- Login ด้วย Supabase Auth
- ระบบ role และ permission กลาง
- ดึงผู้ใช้/role/permission จากข้อมูล V1 เข้าสู่ staging แล้ว
- หน้า admin สำหรับดู permissions
- หน้าแรกแสดงโมดูลตามสิทธิ์ของผู้ใช้ ไม่ใช่ทุกคนเห็นทุกระบบเท่ากัน

### Shared Catalog / Warehouse Data

- โครงสร้างข้อมูลสินค้า, alias สินค้า, vendor, warehouse/location และข้อมูลพื้นฐานคลัง
- นำข้อมูล snapshot เข้าสู่ staging แล้ว เพื่อใช้ต่อกับ Picking และโมดูลถัดไป

### Picking

Picking เป็นโมดูลนำร่องที่ทำไปไกลที่สุด ตอนนี้บน staging ทำได้แล้ว:

- ดูรายการใบเบิก Picking
- ดูรายละเอียดใบเบิก
- สร้างใบเบิกใหม่
- ใช้เลขบิลรายวันแบบ transaction-safe ลดปัญหาเลขชนกัน
- เลือกสินค้า/กรอกสินค้า free text ในใบเบิก
- เปลี่ยนสถานะ `pending -> picked -> sent`
- รายงานปัญหา/ของขาด โดยบันทึกจำนวนที่ขอเทียบกับจำนวนจริงรายบรรทัด
- แยกสิทธิ์ผู้ใช้ เช่น reader ดูได้อย่างเดียว, writer สร้าง/เปลี่ยนสถานะ/รายงานปัญหาได้, guest เข้าไม่ได้

### เอกสารประกอบ

- แผนรวมจนถึง V1 parity: `docs/plans/V2-0022-full-v1-parity-timeline.md`
- ภาพ database/data flow แบบ HTML: `docs/database/data-flow.html`
- decision board สำหรับดูงานถัดไป: `docs/project-management/decision-board.md`
- handoff/current-state สำหรับให้ agent หรือ developer ทำงานต่อได้: `docs/handoff/current-state.md`

## 4. ตอนนี้ทำได้ถึงไหนแล้ว

### เสร็จและทดสอบผ่านบน staging

- App shell ของ Next.js
- Login/session พื้นฐาน
- Core schema, users, roles, permissions
- Main portal ภาษาไทยแบบ operator-facing
- Admin permission viewer
- Shared catalog/warehouse baseline
- Picking list/detail
- Picking create requisition
- Picking status transition
- Picking problem reporting

### กำลังเป็นขั้นตอนถัดไป

- Picking LINE notification/failure recovery
- เริ่มแบบ disabled/dry-run ก่อน หมายถึงบันทึกผลการแจ้งเตือนในระบบ แต่ยังไม่ส่ง LINE จริง
- การส่ง LINE จริงต้องมี credentials และต้องได้รับอนุมัติแยกต่างหาก

### ยังไม่พร้อมแทน production V1

- ยังไม่ cutover Picking ไปแทน V1 production
- ยังไม่ได้เปิดใช้งาน LINE จริงใน V2
- PR, PO, GR ยังไม่ได้ทำเป็น workflow ใช้งานจริงใน V2
- TRDAKRA, AKRA W5, Returnitem, KPI ยังอยู่ใน roadmap
- ประวัติ Picking เดิมใน V1 จะยังคงเป็น read-only archive สำหรับช่วง cutover แรก

## 5. สิ่งที่ผู้ใช้แต่ละกลุ่มทำได้ตอนนี้

### Admin

- เข้า portal ได้
- เห็นโมดูลตามสิทธิ์ admin
- ดูหน้า permissions
- เข้า Picking และทำ action ได้ครบตามที่ implemented

### Picking Writer

- ดูรายการและรายละเอียด Picking
- สร้างใบเบิกใหม่
- mark picked / mark sent
- รายงานปัญหา

### Picking Reader

- ดูรายการและรายละเอียด Picking
- ดู problem reports
- สร้างหรือเปลี่ยนสถานะไม่ได้

### Guest / ผู้ไม่มีสิทธิ์

- เข้าโมดูล Picking ไม่ได้
- เห็นสถานะ permission denied ตาม guard ของระบบ

## 6. Roadmap ถัดไปแบบย่อ

1. ปิดงาน Picking LINE notification/failure recovery แบบ dry-run
2. ทำ Picking cutover package เพื่อให้ตัดสินใจได้ว่า V2 Picking พร้อมแทน V1 หรือไม่
3. วาง foundation ของ PR/PO/GR ร่วมกัน
4. ทำ PR, PO, GR ตามลำดับ workflow
5. ทำ Warehouse/TRDAKRA และ AKRA W5
6. ทำ Returnitem
7. ทำ KPITracker และ analytics
8. ทำ hardening, UAT, security review, performance check และ cutover ทีละโมดูล

## 7. ข้อความแนะนำสำหรับนำเสนอหัวหน้างาน

V2 ไม่ใช่การแก้ระบบเดิมทีละจุด แต่เป็นการสร้างระบบกลางใหม่ให้รองรับทุกโมดูลในระยะยาว โดยยังปล่อยให้ V1 เป็นระบบ production ระหว่างย้ายงาน

ตอนนี้ foundation สำคัญพร้อมแล้ว ได้แก่ login, permission, portal, database structure และ Picking pilot หลาย workflow ทดสอบผ่านบน staging แล้ว

ขั้นตอนถัดไปคือปิด Picking ให้พร้อมตัดสินใจ cutover โดยเพิ่ม LINE notification/failure recovery แบบ dry-run ก่อน จากนั้นจึงทำ cutover package เพื่อให้ผู้บริหารและผู้ใช้งานตัดสินใจได้บนข้อมูลจริง ไม่ใช่ตัดสินใจจากแค่หน้าจอเดโม

## 8. ประเด็นที่ต้องตัดสินใจในอนาคต

- จะ cutover Picking เมื่อใด หลัง LINE dry-run และ cutover package พร้อม
- PR/PO/GR จะเปิดใช้งานเป็นชุดเดียว หรือทยอยเปิดบาง workflow
- โมดูลใดต้อง import ประวัติเก่าเข้า V2 และโมดูลใดเก็บ V1 เป็น read-only archive ได้
- ช่วง UAT ของแต่ละโมดูลจะให้ใครเป็นผู้ทดสอบและอนุมัติ

## 9. หมายเหตุความปลอดภัย

- V1 production ยังไม่ถูกแก้จากงาน V2
- V2 ใช้ staging/preview สำหรับทดสอบก่อน
- ไม่มีการ commit secret เช่น service role key, LINE token หรือ database password
- privileged actions ทำฝั่ง server ไม่เปิด secret ให้ browser

