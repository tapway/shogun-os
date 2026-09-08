import { useState } from 'react';
import { Users, BookOpen, Globe, Shield, FileText, X, Video, Image as ImageIcon, MapPin, Briefcase, Clock, Calendar, CreditCard, Building, Package, UserCheck, GraduationCap, Trophy, Heart, Star, Target, Play, Eye } from 'lucide-react';

interface Props {
  department: string;
  color: string;
}

const NAVY = 'var(--samurai-primary, #1a284d)';
const SURFACE = 'var(--samurai-surface, #0e1424)';
const SURFACE_2 = 'var(--samurai-surface-2, #151c2e)';
const BORDER = 'var(--samurai-border, #243047)';
const TEXT = 'var(--samurai-text, #ffffff)';
const MUTED = 'var(--samurai-muted, #a8a8a8)';
const LIME = 'var(--samurai-lime, #ceef7d)';
const LIME_DIM = 'var(--samurai-lime-dim, #b5d96a)';
const LIME_TEXT = 'var(--samurai-accent-button-text, #1a284d)';

interface TopicItem {
  id: string;
  title: string;
  type?: 'document' | 'video' | 'link' | 'image' | 'pdf' | 'embed';
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  pdfUrl?: string;
  embedUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  content?: string;
}

interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  topics: TopicItem[];
}

const HANDBOOK_PDF = '/handbook/employee-handbook-2026.pdf?v=2';

const SECTIONS: Section[] = [
  {
    id: 'team',
    title: 'Team',
    icon: Users,
    topics: [
      { id: 'handbook', title: 'Employee Handbook 2026', type: 'pdf', icon: BookOpen, pdfUrl: HANDBOOK_PDF },
      { id: 'mission', title: 'Mission, Vision, Values', type: 'document', icon: Target, content: `💡 A company mission provides direction and purpose, aligning actions and decisions towards a common goal. It also helps attract like-minded individuals who share the same values and vision for the company.

⚖️ Company Core Values

Excellence
• We strive for the highest quality in everything we do.

Integrity
• We act with honesty and transparency in all our dealings.

Teamwork
• We collaborate and support one another to achieve shared goals.

Innovation
• We embrace change and continuously seek better ways of working.

Accountability
• We take ownership of our actions and deliver on our commitments.` },

      { id: 'values-video', title: 'Core Values Video', type: 'video', icon: Play, videoUrl: 'https://www.youtube.com/embed/_fNUQeZLGII' },
      { id: 'org-chart', title: 'Organisational Chart', type: 'image', icon: Building, imageUrl: 'https://www.smartsheet.com/sites/default/files/2024-05/organizational-chart-template-hero.png' },
      { id: 'office-tour', title: 'Office Tour', type: 'document', icon: Eye, content: `💡 Take a virtual tour of our Company office at Pacific Place.

Video Link: [Sample Link - Internal Document] (sample placeholder)

Office Highlights:
• Open-plan workspace with collaborative zones
• Meeting rooms equipped with video conferencing
• Pantry area with coffee machine and snacks
• Prayer room for Muslim staff
• Server room with climate control
• Reception area with visitor seating` },
      { id: 'directions-company', title: 'How to Get to Office', type: 'document', content: `💡 Directions to Main Office

Address: Unit X-XX, Level XX, Pacific Place Commercial Centre, Jalan PJU 1A/4, Ara Damansara, 47301 Petaling Jaya, Selangor

By Car:
• From LDP Highway: Exit at Ara Damansara, follow signs to Pacific Place
• Parking: Basement parking available (RM 3/hour, max RM 20/day)
• Enter via main lobby, take lift to Level XX

By Public Transport:
• LRT: Kelana Jaya Line to Ara Damansara station, 5-min walk
• Grab: Drop-off at Pacific Place main entrance

Contact: +603-XXXX XXXX for assistance` },
      { id: 'directions-itmax', title: 'How to Get to Office (Branch)', type: 'document', icon: MapPin, content: `💡 Directions to Branch Office

Address: Level XX, Menara Commercial, Jalan XXXX, 50450 Kuala Lumpur

By Car:
• From DUKE Highway: Exit at Sentul, follow signs to Menara Commercial
• Parking: Multi-storey car park adjacent to building (RM 2/hour)
• Enter via main entrance, security checkpoint at ground floor

By Public Transport:
• LRT: Ampang Line to Sentul Timur station, 3-min walk
• KTM: Batu Caves line to Sentul station, 5-min walk
• Grab: Drop-off at Menara Commercial lobby

Note: Visitor pass required — register at security desk with IC` },
      { id: 'staff-pics', title: 'Staff Pics', type: 'document', icon: ImageIcon, content: `💡 Team Photos & Events Gallery

Our team photos are stored in the shared Google Drive folder. Access requires Company account login.

Folder Link: [Sample Link - Internal Document] (sample placeholder)

Recent Albums:
• 2026 Company Dinner — January 2026
• Hari Raya Open House — April 2026
• Team Building at Janda Baik — March 2026
• Product Launch Event — February 2026
• Monthly Birthday Celebrations

To upload your event photos, contact HR or the Marketing team.` },
    ],
  },
  {
    id: 'sop',
    title: 'SOP',
    icon: BookOpen,
    topics: [
      { id: 'briohr-video', title: 'BRIOHR & Attendance Video Guidelines', type: 'document', icon: Clock, content: `💡 Watch the BRIOHR attendance system tutorial video.

Video Link: [Sample Link - Internal Document] (sample placeholder)

Topics Covered:
• How to clock in/out using facial recognition
• Setting up location tracking on mobile app
• Submitting leave and claim requests
• Viewing your attendance history
• Troubleshooting common issues

Duration: 15 minutes | Language: English/Malay` },
      { id: 'jibble-clock', title: 'How to Clock In/Out (Jibble)', type: 'document', icon: Clock, content: `💡 This guide is created for all staff of Company to use for attendance.

A. CLOCK IN/CLOCK OUT

Signing in
To access your account for the first time, you'll need to accept an invitation that you'll receive either via a link, email or SMS. After that, you can sign in from the mobile app or on the web. Please confirm with HR for your activation credentials.

Ways to Clock In/Out
There are several ways you can track time in Jibble, which includes the web app, mobile app, Chrome timer extension, or Slack but depending on your Work From - Activities (WFH/WFO/ON-SITE). Please follow instructions carefully based on your WFO/WFH/ON-SITE activities:

💡 Web App/Jibble Website - FOR WFH ONLY

1. Log in to your account through a web browser (https://www.jibble.io/)
2. At the top of the screen, you'll see your timer buttons.
3. Initiate the timer by clicking on the green Play button to clock in. You can choose an activity and project if necessary (applicable for certain department - projects/product related), then tap on Save to start the timer.
4. Once clocked in, you'll see a few other timer options.
5. The green Switch Activity button is used to switch to a different activity and/or project. During the switch, your timer is continuous and doesn't stop.
6. The other button you'll see is the red Stop button, used to clock out.
7. Once you've completed work for the day, you can click on red / stop button and tap on Save to clock out.
8. You may also choose "Auto Clock Out" if you want the system to automatically clock out based on your setting - in case you tend to miss out to clock out.

💡 Mobile App - FOR WFO (COMPULSORY TWICE A WEEK) OR OTHER ACTIVITIES

1. Log in to your account via mobile app available on both Android and iOS platforms.
2. Navigate to the Time Clock screen.
3. Facial recognition may be required for clocking in and out, requiring you to take a photo as your face data.
4. The timer buttons here are similar to those on the web app.
5. Click on the green Clock In button and select an activity and/or project to start the timer.
6. Once clocked in, you'll see the green Switch Activity button, yellow Break button and red Clock out button.
7. Proceed with creating your time entries by following the steps mentioned earlier.

B. Facial Recognition
You are required to set up your face data which will be used as a baseline photo for Jibble to verify you. If face data has not been set up yet, you will be prevented from clocking in and out. Follow the steps indicated to set up your face data for facial recognition.

C. Location Tracking
Your GPS information will be automatically captured and saved into your timesheets upon clocking in and out via Jibble's mobile app (For WFO activity ONLY).

[IMPORTANT] Note that if GPS tracking is enforced, you will be required to grant the Jibble app in your MOBILE and allow access to your location via your device settings. (Choose Always)

D. Notifications & Alerts
Reminders help you form a habit of clocking in and out at certain times based on your schedule. Notifications and alerts can be set via your account settings to receive clock in or out reminders throughout your workday. You will be able to receive notifications via email or via push notifications directly on your mobile device. Check out our guide on enabling push notifications for more information.

E. Account Settings
Your account settings is where you can update your login details such as your password, personal notifications and alerts, data privacy and more. Click on the link to know what you can do and how to update your account settings.

F. Adding Widget for Clock in/out

Adding the Jibble widget on iOS
1. Go to the Home Screen page where you want to add the widget, then touch and hold the Home Screen background until the apps begin to jiggle.
2. Tap + at the top of the screen to open the widget gallery.
3. Search and select Jibble 2.
4. Click Add Widget.
5. While the apps are still jiggling, move the widget where you want it on the screen, then tap Done.
6. Alternatively, Touch and hold a widget or an empty area in the Today View and continue the steps as mentioned above.

Adding the Jibble widget on Android
1. On the Home screen, touch and hold an empty space.
2. Tap on Widgets.
3. You'll find widgets for apps installed on your phone.
4. Look for Jibble then touch and hold the widget.
5. Drag the widget to where you want it and lift your finger.

Using the time tracking widget
1. Once the widget has been added, it is in a deactivated state. To activate the widget, click on the widget to get redirected to launch Jibble's mobile app.
2. To start tracking time, click on the green Clock In icon in the time tracking widget. You will get redirected to the time clock screen on Jibble's mobile app. Once clocked in, the timer will start, and the total ongoing duration within the widget will be updated. Any locations, activities or projects chosen upon clock in will be displayed. Note: On Android devices, the last recorded time entry will be shown and updated every 30 minutes within the widget. Total ongoing duration of time entries will not be displayed.
3. To start breaks, click on the yellow Break icon in the time tracking widget. You will get redirected to the time clock screen to confirm your break entry. Once a break is started, the widget will be updated.
4. To end breaks, click on the yellow End Break icon in the time tracking widget. You will get redirected to the time clock screen to confirm your entry.
5. To clock out, click on the red Clock Out icon in the time tracking widget and confirm your out entry on the time clock screen. The last clocked-out time will be displayed within the widget.

❗ Important: If a different platform is used to clock in, take breaks or clock out (i.e. web, Slack, MS Teams), the mobile app needs to be refreshed or opened for the widget to be updated.` },


      { id: 'submit-claim', title: 'How To Submit Claim?', type: 'document', icon: CreditCard, content: `To refer claim categories details please click here.

Claim Procedure (For Full-time Employee Only)

1. Using BRIO-HR app (mobile/desktop) ONLY: Login to your account
2. On the browser, click My Claims or Claims to submit the claims
3. Click: + New Claim and proceed to add the required details.
4. You may choose the Claim Type accordingly
5. You may also need to add attachment (upload the receipt from your device gallery).
6. Save & Add another or Save
7. Example of the attachment for (Car) Mileage Claim up to 300KM (MUST include the destination: go & return).
8. No. of KM must be included in the screenshot.
9. For (Car) Mileage Claim from 301km and above, you may use the same attachment as in Mileage Claim up to 300KM - (eg: total KM = 684KM) put the remaining 384KM (684KM - 300KM) in the Distance section in (Car) Mileage Claim from 301km and above.
10. You may continue with other claims and choose Claim Type accordingly.
11. The claims may be rejected if you attached the wrong information and attachment.
12. For Choose Report/Report name, please put the month of the submitted claim - eg: August Claim 2023
13. Admin will process by checking the claims detail and submit to HR/Finance for approval.
14. Once approved, Finance will proceed with payment to staff.
15. The payment will be done latest by 15th of the month or earlier.

To check the status of your claims:
• For browser, go to Home > Expense Claims
• For smart phone, go to Home > Ongoing Claims
• You will be notified whenever the claim is approved or rejected.
• Email or notification will be sent to update your claim status

How to check claim types limit:
• Go to Home > Expense Claims
• Click on Claim limit & balance
• Choose claim type and you can see your claim limit

Claim Procedure (For Part-time/Intern)

1. To submit claim by filling in the claim form personal (for personal claim, parking etc)
2. Mileage claim form (for mileage/toll only)
3. Send it to Admin (hairul@gocompany.com) and cc HR (Hana@gocompany.com & hr@gocompany.com & hrintern@gocompany.com)
4. Attach receipts & screenshots of mileage from Google Maps

Personal Claim (For any claim except for mileage purposes)
Template - Personal Claim Form.xlsx

Mileage Claim (Mileage claim purposes only)
TEMPLATE_ Name - Mileage Claim (Updated).numbers.numbers

💡 Policy brief & purpose
Company Claim Policy outlines how we'll reimburse staff for work-related expenses. We'll define "work-related expenses" and set a procedure to authorize expenditure. This policy applies to all staff that need to spend money for work-related activities.` },
      { id: 'roller-shutter', title: 'Roller Shutter Guide', type: 'document', icon: Building, content: `💡 Operating the office roller shutter safely.

Location: Main entrance of Company office

Opening Procedure:
1. Locate control panel on right side of shutter
2. Press and hold UP button until fully open
3. Ensure safety sensor is clear before operating
4. Do not force shutter if obstructed

Closing Procedure:
1. Clear area beneath shutter
2. Press and hold DOWN button
3. Stand clear while shutter descends
4. Verify shutter is fully closed and locked

Safety Rules:
• Never operate if sensor light is flashing red
• Report malfunction to Facilities team immediately
• Last person leaving must ensure shutter is closed
• Keys kept at reception desk during office hours

Emergency Contact: Building Security +603-XXXX XXXX` },
      { id: 'collect-parcel', title: 'Collecting Parcel', type: 'document', icon: Package, content: `💡 Procedure for receiving and collecting parcels at the office.

Receiving Parcels:
1. Courier delivers to reception desk
2. Receptionist logs parcel in delivery register
3. Recipient notified via Slack/email
4. Collect from reception within 2 working days

Collection Steps:
1. Go to reception during office hours (9am-5pm)
2. Provide your name and tracking number
3. Sign collection register
4. Inspect parcel for damage before signing

Important Notes:
• Personal parcels should not be sent to office address
• Company parcels only — label with department name
• Uncollected parcels after 5 days returned to sender
• High-value items require HOD signature

Contact: Reception +603-XXXX XXXX ext. 100` },
      { id: 'visitor-log', title: 'Visitor Log', type: 'document', icon: UserCheck, content: `💡 Visitor registration and security protocol.

Registration Process:
1. Visitor arrives at reception
2. Present valid ID (IC/Passport) to receptionist
3. Receptionist records: Name, Company, Purpose, Host, Time In
4. Visitor receives visitor badge — must wear visibly
5. Host notified via Slack/phone
6. Escort required for all visitors beyond reception area

Departure:
1. Return visitor badge to reception
2. Receptionist records Time Out
3. Badge retained by reception

Rules:
• All visitors must be pre-approved by host department
• No unescorted access to server room or R&D lab
• Photography prohibited without written permission
• Visitors must sign NDA if accessing confidential areas
• Children under 12 not permitted in office premises

Emergency: Visitors must follow evacuation procedures with host` },
      { id: 'tidy-office', title: 'Keeping a Tidy Office', type: 'document', icon: Star, content: `Keeping a Tidy Office

All employees are responsible and should contribute to create a conducive working environment.

• Employees should try to conserve water and electricity.
• Where applicable, lights should be switched off during lunch hours and after office hours.
• All employees should ensure that their working areas are clean.
• Any unwanted items such as papers and boxes need to be disposed.
• All employees should not litter the common areas, pantries and toilets.` },
    ],
  },
  {
    id: 'website-training',
    title: 'Official Website/Training',
    icon: Globe,
    topics: [
      { id: 'website', title: 'Company Website', type: 'document', icon: Globe, content: `💡 Company Official Website

https://gocompany.com/

Visit our official website to learn more about:
• Our products and solutions (PeopleTrack, VehicleTrack, StoreTrack)
• Company background and mission
• Latest news and updates
• Contact information
• Career opportunities` },
      { id: 'social-media', title: 'Social Media', type: 'document', icon: Heart, content: `💡 Company's Social Media

🐦 Twitter: @CompanySolutions
📸 Instagram: @CompanySolutions
📘 Facebook: Company
🔖 LinkedIn: Company
📱 TikTok: @CompanySolutions

Follow us on social media to stay updated with:
• Latest product launches and features
• Company news and milestones
• Industry insights and thought leadership
• Event participation and conferences
• Career opportunities and team culture` },
    ],
  },
  {
    id: 'policies',
    title: 'Company Policies',
    icon: Shield,
    topics: [
      { id: 'code-conduct', title: 'Code of Conduct', type: 'document', icon: Shield, content: `💡 1. Working Hours and Rest Day

Working Schedule:
• Monday - Friday: 8.00 am - 5.00 pm OR 9.00 am - 6.00 pm (flexible start time)
• Saturday & Sunday: Rest Day
• Lunch Break: Flexible 1 hour
• Friday Lunch (Male Muslim employees): 12.30 pm - 2.30 pm

Office Attendance:
• Compulsory 3 days working from office
• Friday or last day of the week is compulsory (subject to change)
• Clock in via face scanner when arriving at office
• Clock via face scan OR tap IC/TnG card, even when door is already opened

💡 2. Work from Home (WFH)

• All employees entitled to work remotely except on mandatory office days
• Employees responsible for maintaining high productivity and responsiveness
• HOD tracks employee productivity and reports concerns to HR
• HR may issue warning letter (with management approval) if employee is MIA during WFH hours

💡 3. Gazetted Public Holidays

• Entitled to all gazetted Federal/State public holidays based on location
• Annual holiday calendar circulated at start of each calendar year
• Sudden proclaimed government holidays treated as paid holidays
• If public holiday falls on Sunday, additional paid holiday granted as substitution
• No holiday pay if absent without approval on working day before/after public holiday` },
      { id: 'leave-rules', title: 'Leave Rule & Categories', type: 'document', icon: Calendar, content: `💡 Any leaves must be applied through our Payroll Panda system (exclude interns) and keep your manager/HOD informed.

Leave Rule

1. Full Time - Permanent or Confirmed Position
   • Entitled to all types of leaves
   • Planned Annual or Unpaid Leave - less than 5 days leave
     - Must be applied 3 days before
     - Must be approved by HOD
     - Leave taken without approval will be considered as AWOL
   • Planned Annual or Unpaid Leave - more than 5 days leave
     - Must be applied 5 days before
     - Must be approved by HOD
     - Leave taken without approval will be considered as AWOL
   • Unplanned Annual or Unpaid Leave - less than 5 days leave
     - This is considered as Emergency Leave
     - Any unplanned leave taken will affect the performance scores
     - Can be applied on the day
     - Must have legitimate reason and proof

2. Full Time - Probation Position
   • Entitled to a pro-rated Annual Leave, Sick Leave, and Compassionate Leave
     - Annual Leave: 1.5 days/completed month (e.g., total of 9 AL for 6 months of probation period)
     - Sick Leave: 1 day/completed month
     - Compassionate Leave: 1 day/occasion/year
   • Planned Annual Leave - less than 3 days leave
     - More than 3 days leave is not allowed
     - Must be applied 3 days before
     - Must be approved by HOD
     - Leave taken without approval will be considered as AWOL
   • Unplanned Annual Leave - 1 day leave
     - This is considered as Emergency Leave
     - Only 1 day is allowed
     - Can be applied on the day
     - Must have legitimate reason and proof
     - Any unplanned leave taken will affect the performance scores

3. Internship
   • Entitled to Annual Leave, Sick Leave, and Compassionate Leave
     - Annual Leave: 1 day/completed month
     - Sick Leave: 1 day/completed month
     - Compassionate Leave: 1 day/occasion/year
   • Must be applied 3 days before, except for Compassionate Leave
   • Emergency Leave is not allowed
   • Must be approved by HOD
   • Leave taken without approval will be considered as AWOL

Leave Categories

1. Paid Leave

1.1 Annual Leave
• All permanent and confirmed employees shall be entitled to eighteen (18) days annual leave
• The annual leave shall be granted after successful completion of their probationary period, and it will be a continuity for any taken leaves during the probationary period
• For other types of employment, shall refer to clause above, Leave Rule
• Application of leave, shall refer to clause above, Leave Rule
• Approval of leave is subject to operational requirements where the amount of leave taken at a time may need to be changed in accordance with the operational needs
• An employee is allowed to take Half Day Leave which is deducted from an employee's annual leave eligibility:

| Session | Half Day Leave |
| --- | --- |
| Morning (am) | 8.00 am - 12.00 pm |
| Afternoon (pm) | 2.00 pm - 5.00 pm |

• All employees are entitled to carry forward the Annual Leave up to maximum 10 days with conditions:
  - Maximum 5 days can be utilised until March the following year
  - The remaining days need to be utilised in January the following year
  - Any remaining days after March the following year will be removed

1.2 Medical Leave / Sick Leave
• All employees shall be eligible to paid sick leave of fourteen (14) days in a calendar year
• In the case of an emergency, an employee may produce the sick leave certificate from any available registered medical practitioner
• An employee shall be required to notify the HOD not later than 10.00 am on the scheduled work day
• The employee is requested to produce the sick leave certificate to the Supervisor for verification and then to submit to the HR Department on the first day the employee returns to work
• An employee who absents him/herself from work on sick leave and does not inform or attempt to inform the HOD of such sick leave within forty-eight (48) hours of the commencement shall be deemed absent from work without permission and shall be subjected to disciplinary action

1.3 Hospitalization Leave
• Where hospitalization is necessary, an employee shall be entitled to paid hospitalization leave of sixty (60) aggregate days in each calendar year
• For this purpose, the total number of sixty (60) days of hospitalization leave shall be inclusive of any sick leave previously taken in that year
• An employee or his/her representative shall notify the HOD as soon as the employee is admitted in the hospital
• Within three (3) days of hospitalization, the employee or his/her representative must notify the HOD and HR Department for the duration of the hospitalization leave and expected date to resume work
  - It is the responsibility of the HOD to ensure that HR Department is fully aware of such notification
  - An employee is requested to produce the hospitalization leave certificate to the HOD for verification and then to submit to the HR Department on the first day the employee returns to work

1.4 Compassionate Leave
• The company shall grant three (3) consecutive working days of paid compassionate leave to an employee in any calendar year under the following circumstances:
  - Natural disaster which affects the employee's person or property, such as flood, fire and landslide
  - Death of spouse, child, siblings and parents
  - Death of parents-in-law
• The employee shall produce documentary evidence to qualify for compassionate leave
• Any employee found obtaining compassionate leave through mislead of facts shall be subjected to disciplinary action
• Any circumstances other than the above shall be treated as emergency leave

1.5 Marriage Leave
• An employee shall be granted paid marriage leave for three (3) consecutive working days on his/her legal marriage
• Application for marriage leave shall be supported by a marriage certificate

1.6 Paternity Leave
• Male employees shall be granted seven (7) consecutive working days of paid paternity leave on the birth of the child by his legal spouse
• The employee shall produce the birth certificate of his child in order to qualify for the paternity leave

1.7 Maternity Leave
• Every female employee shall be entitled for paid maternity leave for a period of ninety eight (98) consecutive days in respect of each confinement up to 5 surviving children
• The ninety eight (98) consecutive days of maternity leave shall be inclusive of off days, rest days and public holidays
• A female employee who has completed not less than ninety (90) continuous days of service with the Company during the nine months immediately before her confinement
• Maternity leave shall be granted on or after the 28th week of pregnancy. Miscarriage as defined in the Employment Act, 1955 will be treated as a normal sick leave
• To facilitate the planning of work schedule during the female employee's absence, application of maternity leave shall be made at least two (2) weeks before the start of the maternity leave

1.8 Work Anniversary Leave
• An employee shall be granted paid work anniversary leave for one (1) day on his/her work anniversary month
• The leave is non-transferable to other month
• Only entitled for permanent staff

1.9 Birthday Leave
• An employee shall be granted paid birthday leave for one (1) day on his/her birthday month
• The leave is non-transferable to other month
• Only entitled for permanent staff

1.10 Time Slip (For medical matters)
• In the case of an emergency, an employee may produce the Time Slip certificate from any available registered medical practitioner
• This certificate acts as an alternative to sick leave, where the employee may need to be away from working hours less than 4 hours

2. Unpaid Leave
• An employee may apply for unpaid leave when:
  - His/her annual leave has been duly exhausted
  - All medical leave for the year has been duly exhausted but the employee has been deemed as medically unfit by the Company's panel doctor or a registered medical practitioner
• Unpaid leave shall be granted to employees at the sole discretion of the Company and based on the merit of each individual case

3. Absent Without Leave (AWOL)
• An employee must confirm his/her leave application has been approved before going on leave
• An employee who has not had his annual leave approved and then fails to report for work shall be deemed to be absent without leave
• After investigating, where necessary, the company may take appropriate disciplinary action which involves issuing an official HR Warning Letter

4. Leave Encashment
• Employees who resign, retire or retrenched from their services shall be granted an annual leave on a pro-rated basis for the completed days of service in the Company, or will be paid for all accrued annual leave not taken
• This clause only applies to permanent or confirmed employees
• The unutilised prorated annual leave is calculated:
  - Total annual leave is 18 days for 12 completed months
  - E.g. the last working day is 30/6/2022:
    * The entitled leave is 9 days
    * The utilised leave as todate is 6 days
    * The balance for encashment is 3 days
  - E.g. the last working day is 31/3/2022:
    * The entitled leave is 4.5 days
    * The utilised leave as todate is 5 days
    * The over utilised leave is 0.5 days, and shall be deducted from the final payroll
• The amount of leave encashment and deduction calculation shall refer to clause 3.6, pro-rated salary calculation` },



      { id: 'expenses', title: 'Claimable Expenses', type: 'document', icon: CreditCard, content: `Claimable Expenses

All claims must be submitted through the updated HR system. Each receipt can only be used for one type of claim.

Health & Wellness
• Outpatient Medical (OMC): RM 500/year — Probation + Permanent
• Health & Wellness: RM 400/year — Permanent only
• Dental/Optical: RM 300/year — Permanent only
• In-patient Insurance: RM 75,000/year cap — Permanent + Contract

Travel & Transport
• Parking: Monthly reimbursement (Pacific Place valet / TnG basement)
• Mileage: RM 0.80/km (0–300km), RM 0.50/km (301km+)
• Taxi/Grab/Toll/Parking: RM 150/month cap
• Flight/Train: Economy class, HR approval, outstation only
• Meals: RM 50/day (local), USD 30/day (overseas)
• Accommodation: RM 250/day (MY), USD 100/day (overseas)

Working Essentials
• Phone Bill: Director RM 80/mo, Others RM 50/mo
• WFH Expenses: RM 200/year (single receipt, permanent/confirmed only)` },
      { id: 'training-dev', title: 'Training & Development', type: 'document', content: `Training & Development

The company encourages training and development to motivate employees to contribute more effectively to business growth.

Training Course / Certification Program
• Bonded agreement required based on course value:

Course Value | Bonded Period
Less than RM 10,000 | 12 months
RM 10,001 – RM 20,000 | 24 months
More than RM 20,000 | 36 months

• Violation of bonded terms requires full repayment of training cost.

Training Module
• Cost < RM 5,000, no certificate provided
• No bonded agreement required
• HR arranges and maintains training records` },
      { id: 'anti-harassment', title: 'Anti-harassment and non-discrimination Policy', type: 'document', content: `Anti-Harassment and Non-Discrimination Policy

Prevention of Sexual Harassment
• Sexual harassment means any unwanted conduct of a sexual nature having the effect of verbal, non-verbal, visual, psychological or physical harassment.
• HOD personnel shall protect subordinates from such harassment by providing advice and help.
• An employee who believes they have been subjected to sexual harassment should report to their HOD, who forwards the case to HR.
• False accusations shall be subjected to disciplinary action.
• Guilty employees shall be sentenced which includes dismissal.

Diversity & Empathy (Core Value)
• We are open for people, and working with people from diverse backgrounds.
• While being honest, respect each other. Value and honour another person, both their words and actions.
• Accept others without trying to change them.

Occupational Safety and Health (OSHA)
• Reduce or eliminate work-related injuries and implement safe work practices.
• Comply with OSHA Act 1973 regulations.
• All employees must report accidents, injuries and illness to HOD promptly.
• All employees must identify unsafe conditions in the workplace.` },
    ],
  },
];

export function HrCornerTab({ department, color }: Props) {
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('team');

  return (
    <div className="sd-stack">
      {/* Welcome Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, ${SURFACE_2} 100%)`,
        border: `1px solid ${BORDER}`,
        borderRadius: '12px',
        padding: '28px 32px',
        color: TEXT,
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <span style={{ fontSize: '2rem' }}>👋🏻</span>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: TEXT }}>Welcome to HR Corner</h2>
            <p style={{ fontSize: '0.85rem', color: LIME, margin: '4px 0 0', fontWeight: 600 }}>Employee Handbook 2026 · Revision 5</p>
          </div>
        </div>
        <p style={{ fontSize: '0.88rem', lineHeight: 1.6, margin: '16px 0 0', color: MUTED, maxWidth: '800px' }}>
          This dashboard is designed to provide you with information about working conditions, employee benefits and policies. 
          For more details you may refer to the company handbook. If you are in doubt in certain contents of this dashboard 
          or in the handbook, you should seek clarification from the Human Resource Department.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Sidebar */}
        <div style={{ gridColumn: 'span 4' }}>
          <div className="sd-chart-card" style={{ 
            background: SURFACE, 
            border: `1px solid ${BORDER}`,
            padding: 0,
            borderRadius: '12px',
          }}>
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isExpanded = expandedSection === section.id;
              return (
                <div key={section.id}>
                  <button
                    onClick={() => setExpandedSection(isExpanded ? '' : section.id)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      background: isExpanded ? SURFACE_2 : 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${BORDER}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Icon className="h-5 w-5" style={{ color: isExpanded ? LIME : MUTED }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: isExpanded ? TEXT : MUTED, transition: 'color 0.2s ease' }}>
                        {section.title}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: MUTED, transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  </button>
                  
                  {isExpanded && (
                    <div style={{ padding: '8px 0', background: SURFACE_2 }}>
                      {section.topics.map((topic) => {
                        const isSelected = selectedTopic?.id === topic.id;
                        return (
                          <button
                            key={topic.id}
                            onClick={() => setSelectedTopic(topic)}
                            style={{
                              width: '100%',
                              padding: '12px 20px 12px 52px',
                              background: isSelected ? `${LIME}20` : 'transparent',
                              border: 'none',
                              borderLeft: isSelected ? `3px solid ${LIME}` : '3px solid transparent',
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontSize: '0.82rem',
                              color: isSelected ? LIME : MUTED,
                              fontWeight: isSelected ? 600 : 400,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = `${LIME}10`; }}
                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}>
                              {topic.icon ? (
                                <topic.icon className="w-4 h-4" style={{ color: isSelected ? LIME : MUTED }} />
                              ) : (
                                <>
                                  {topic.type === 'pdf' && '📕'}
                                  {topic.type === 'video' && '🎥'}
                                  {topic.type === 'link' && '🔗'}
                                  {topic.type === 'image' && '🖼️'}
                                  {topic.type === 'document' && '📄'}
                                </>
                              )}
                            </span>
                            <span className="truncate" style={{ flex: 1 }}>{topic.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ gridColumn: 'span 8' }}>
          {selectedTopic ? (
            <TopicDetailView topic={selectedTopic} onClose={() => setSelectedTopic(null)} />
          ) : (
            <div className="sd-chart-card" style={{ 
              background: SURFACE, border: `1px solid ${BORDER}`, padding: '60px 40px', textAlign: 'center',
              borderRadius: '12px', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.3 }}>📚</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT, margin: '0 0 12px' }}>Select a topic from the sidebar</h3>
              <p style={{ fontSize: '0.88rem', color: MUTED, maxWidth: '450px', lineHeight: 1.6, margin: 0 }}>
                Browse through Team, SOP, Training, or Company Policies sections to access detailed information and resources.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Topic Detail View ────────────────────────────────────────────────────────

function TopicDetailView({ topic, onClose }: { topic: TopicItem; onClose: () => void }) {
  const getTypeInfo = (type?: string) => {
    switch (type) {
      case 'pdf': return { icon: '📕', label: 'PDF Document', color: LIME };
      case 'video': return { icon: '🎥', label: 'Video', color: '#ef4444' };
      case 'link': return { icon: '🔗', label: 'External Link', color: '#3b82f6' };
      case 'image': return { icon: '🖼️', label: 'Image Gallery', color: '#8b5cf6' };
      case 'embed': return { icon: '📊', label: 'Embedded View', color: LIME };
      default: return { icon: '📄', label: 'Document', color: LIME };
    }
  };

  const typeInfo = getTypeInfo(topic.type);

  // PDF viewer mode
  if (topic.type === 'pdf' && topic.pdfUrl) {
    return (
      <div className="sd-chart-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>{typeInfo.icon}</span>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT, margin: 0 }}>{topic.title}</h3>
              <span style={{ fontSize: '0.7rem', color: LIME, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, background: `${LIME}15`, padding: '3px 8px', borderRadius: '4px' }}>
                {typeInfo.label}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <a href={topic.pdfUrl} download style={{
              padding: '8px 16px', background: LIME, color: LIME_TEXT, border: 'none', borderRadius: '8px',
              fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
            }}>📥 Download</a>
            <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${BORDER}`, fontSize: '1rem', color: MUTED, cursor: 'pointer', padding: '6px 10px', borderRadius: '8px' }}>✕</button>
          </div>
        </div>
        <div style={{ height: '75vh', width: '100%' }}>
          <iframe src={topic.pdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} title={topic.title} />
        </div>
      </div>
    );
  }

  // Video embed mode (YouTube, etc.)
  if (topic.type === 'video' && topic.videoUrl) {
    return (
      <div className="sd-chart-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>{typeInfo.icon}</span>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT, margin: 0 }}>{topic.title}</h3>
              <span style={{ fontSize: '0.7rem', color: LIME, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, background: `${LIME}15`, padding: '3px 8px', borderRadius: '4px' }}>
                {typeInfo.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${BORDER}`, fontSize: '1rem', color: MUTED, cursor: 'pointer', padding: '6px 10px', borderRadius: '8px' }}>✕</button>
        </div>
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
          <iframe 
            src={topic.videoUrl} 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} 
            title={topic.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Image view mode
  if (topic.type === 'image' && topic.imageUrl) {
    return (
      <div className="sd-chart-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>{typeInfo.icon}</span>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT, margin: 0 }}>{topic.title}</h3>
              <span style={{ fontSize: '0.7rem', color: LIME, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, background: `${LIME}15`, padding: '3px 8px', borderRadius: '4px' }}>
                {typeInfo.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${BORDER}`, fontSize: '1rem', color: MUTED, cursor: 'pointer', padding: '6px 10px', borderRadius: '8px' }}>✕</button>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <img src={topic.imageUrl} alt={topic.title} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', border: `1px solid ${BORDER}` }} />
        </div>
      </div>
    );
  }

  // Embedded content mode (Google Slides, etc.)
  if (topic.type === 'embed' && topic.embedUrl) {
    return (
      <div className="sd-chart-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>{typeInfo.icon}</span>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT, margin: 0 }}>{topic.title}</h3>
              <span style={{ fontSize: '0.7rem', color: LIME, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, background: `${LIME}15`, padding: '3px 8px', borderRadius: '4px' }}>
                {typeInfo.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${BORDER}`, fontSize: '1rem', color: MUTED, cursor: 'pointer', padding: '6px 10px', borderRadius: '8px' }}>✕</button>
        </div>
        <div style={{ height: '75vh', width: '100%' }}>
          <iframe 
            src={topic.embedUrl} 
            style={{ width: '100%', height: '100%', border: 'none' }} 
            title={topic.title}
            frameBorder="0"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Standard content view
  return (
    <div className="sd-chart-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{typeInfo.icon}</span>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT, margin: '0 0 6px' }}>{topic.title}</h3>
            <span style={{ fontSize: '0.7rem', color: LIME, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, background: `${LIME}15`, padding: '4px 10px', borderRadius: '6px' }}>
              {typeInfo.label}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${BORDER}`, fontSize: '1.2rem', color: MUTED, cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = LIME; e.currentTarget.style.color = LIME; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED; }}
        >✕</button>
      </div>

      <div style={{ padding: '28px' }}>
        {topic.content ? (
          <div style={{ fontSize: '0.92rem', lineHeight: 1.8, color: TEXT, whiteSpace: 'pre-line' }}>
            {topic.content}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: MUTED }}>
            <p>Content coming soon. Please check back later or contact HR for details.</p>
          </div>
        )}

        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {topic.type === 'document' && (
            <>
              <button style={{ padding: '12px 24px', background: LIME, color: LIME_TEXT, border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(206,239,125,0.2)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = LIME_DIM; }} onMouseLeave={(e) => { e.currentTarget.style.background = LIME; }}>
                📥 Download PDF
              </button>
              <button style={{ padding: '12px 24px', background: 'transparent', color: TEXT, border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = LIME; e.currentTarget.style.color = LIME; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT; }}>
                🔖 Bookmark
              </button>
            </>
          )}
          {topic.type === 'video' && (
            <button style={{ padding: '12px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>▶️ Play Video</button>
          )}
          {topic.type === 'link' && (
            <button style={{ padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>🔗 Open Link</button>
          )}
          {topic.type === 'image' && (
            <button style={{ padding: '12px 24px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>🖼️ View Gallery</button>
          )}
          <button style={{ padding: '12px 24px', background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = LIME; e.currentTarget.style.color = LIME; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED; }}>
            ❓ Contact HR
          </button>
        </div>
      </div>
    </div>
  );
}
