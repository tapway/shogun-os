import { useState } from 'react';
import { Users, BookOpen, Globe, Shield, FileText, X } from 'lucide-react';

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
  pdfUrl?: string;
  embedUrl?: string;
  content?: string;
}

interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  topics: TopicItem[];
}

const HANDBOOK_PDF = '/handbook/employee-handbook-2026.pdf';

const SECTIONS: Section[] = [
  {
    id: 'team',
    title: 'Team',
    icon: Users,
    topics: [
      { id: 'handbook', title: 'Employee Handbook 2026', type: 'pdf', pdfUrl: HANDBOOK_PDF },
      { id: 'mission', title: 'Mission, Vision, Values', type: 'document', content: `💡 A company mission provides direction and purpose, aligning actions and decisions towards a common goal. It also helps attract like-minded individuals who share the same values and vision for the company.

🔭 Vision
To democratize AI Vision by allowing anyone to build, train and deploy vision technology solutions quickly and affordably.

🚀 Mission
To build a platform that provides technology solutions to businesses with physical premises in order to help eliminate low-skilled manual labor, improve service quality & experience, and enhance safety & security.

⚖️ Company Core Values

LIGHT THE FIRE IN YOUR HEART
• Love what you do, and do what you love. Be passionate about your work and seek to learn, improve and accomplish goals everyday.
• Be committed to and fully accountable for your goals in alignment with company's collective priorities.
• We commit to the team. Commit to quality. Commit to collaborate. Commit to learn. Commit to do the best we can, every day again. Commit to the Sprint Goal. Commit to be professional. Commit to self-organize. Commit to excellence.

OBSESSED ABOUT CUSTOMERS AND RESULTS
• Build our products and innovation around customers, not what we want.
• Be ready to react quickly to changing customer requirements and environments.
• Always create short term, mid term and long term goals and strive to achieve results.
• Do not sacrifice quality because of time limitation. Strive for the best!

WE ARE FAMILY
• Courage — Do not be afraid to raise concerns about the company or your own work. Have courage to challenge others for what you believe will benefit the company as a whole. We welcome healthy conflicts.
• Diversity & Empathy — We are also open for people, and working with people from diverse backgrounds; acknowledging people to be people.
• Honesty — We are open and honest about our work, our progress, our learning and our problems. We are open in sharing feedback and learning from one another.
• Respect — While being honest, respect each other. Value and honour another person, both his or her words and action, even if we do not approve or share everything he or she does. It is accepting the other person and not trying to change them.
• Teamwork — Teamwork makes the dream work. "Alone, we can do so little, together, we can do so more."

DREAM BIG, THINK DIFFERENT, ACT FAST
• Bias for action — You're not afraid to make decisions and take action, even when (especially when) you face uncertainty.
• Be brave, be creative and think out of the box to solve any particular issue. Be positive in the face of great challenge.
• Have courage to take calculated risks, if it means more success for yourself and the company as a whole.

ALWAYS DAY ONE
• Never stop learning and continue to set personal growth goals for yourself. Make these personal growth goals available to the company so everyone will help each other to achieve these goals.
• Adopt a growth mindset, be curious about everything and think like a beginner a.k.a "shoshin", meaning to adopt an attitude of openness, eagerness, and lack of preconceptions when studying a subject, even when studying at an advanced level, just as a beginner would.` },
      { id: 'values-video', title: 'Core Values Video', type: 'video' },
      { id: 'org-chart', title: 'Organisational Chart', type: 'embed', embedUrl: 'https://docs.google.com/presentation/d/1lBr6v6Yo52Dj384rZyQ2x2pBMYU8YUCEHECM7PRbvFY/embed?start=false&loop=false&delayms=3000', content: `Organisational Structure

Job Classification | Grade | Category | Position
Senior Management | SM1 | Director | Executive Director, CEO
Senior Management | SM2 | Principal of SBU | COO, CFO, CTO
Management | M1 | Head of SBU | General Manager, Senior Department Manager
Management | M2 | Manager | Manager or Team Lead
Assistant Management | AM1 | Assistant Manager | Assistant Manager or Team Lead
Professional | P1 | Specialist | Senior Executive, Senior Engineer, Senior PM
Executive | E1 | Senior L1 Executive | Senior Executive, Senior Engineer, Senior PM
Executive | E2 | Senior L2 Executive | Senior Executive, Senior Engineer, Senior PM
Executive | E2 | Executive | Junior Executive, Junior Engineer, Junior PM
Non-Executive | NE1 | Non-Executive | Clerk, Receptionist, Internship/Trainee
Non-Executive | NE2 | General Worker | Dispatch, Driver, Housekeeper` },
      { id: 'office-tour', title: 'Office Tour', type: 'video' },
      { id: 'directions-tapway', title: 'How to Get to Tapway', type: 'document', content: 'Directions and map to Tapway office at Pacific Place.' },
      { id: 'directions-itmax', title: 'How to Get to ITMAX new office', type: 'document', content: 'Directions and map to ITMAX new office location.' },
      { id: 'staff-pics', title: 'Staff Pics', type: 'image' },
    ],
  },
  {
    id: 'sop',
    title: 'SOP',
    icon: BookOpen,
    topics: [
      { id: 'briohr-video', title: 'BRIOHR & Attendance Video Guidelines', type: 'video' },
      { id: 'jibble-clock', title: 'How to Clock In/Out (Jibble)', type: 'document', content: `💡 This guide is created for all staff of Tapway to use for attendance.

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
      { id: 'jibble-project', title: 'Jibble - Project & Support Team Activities SOP', type: 'document' },
      { id: 'jibble-product', title: 'Jibble - Product & Secondment Project SOP', type: 'document' },
      { id: 'submit-claim', title: 'How To Submit Claim?', type: 'document', content: `To refer claim categories details please click here.

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
3. Send it to Admin (hairul@gotapway.com) and cc HR (Hana@gotapway.com & hr@gotapway.com & hrintern@gotapway.com)
4. Attach receipts & screenshots of mileage from Google Maps

Personal Claim (For any claim except for mileage purposes)
Template - Personal Claim Form.xlsx

Mileage Claim (Mileage claim purposes only)
TEMPLATE_ Name - Mileage Claim (Updated).numbers.numbers

💡 Policy brief & purpose
Tapway Claim Policy outlines how we'll reimburse staff for work-related expenses. We'll define "work-related expenses" and set a procedure to authorize expenditure. This policy applies to all staff that need to spend money for work-related activities.` },
      { id: 'roller-shutter', title: 'Roller Shutter Guide', type: 'document' },
      { id: 'collect-parcel', title: 'Collecting Parcel', type: 'document' },
      { id: 'visitor-log', title: 'Visitor Log', type: 'document' },
      { id: 'tidy-office', title: 'Keeping a Tidy Office', type: 'document', content: `Keeping a Tidy Office

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
      { id: 'aclouddguru', title: 'AcloudGuru Free Learning!', type: 'document', content: `Staff Development is one of the key factors that we value and prioritise in Tapway. Hence, every staff is entitled to free unlimited online courses/learning through AcloudGuru. The details to enroll for the course are as easy as below:

Steps on how to start Online Learning:

1. Check out AcloudGuru to see which course training you would like to take
2. Get login credentials to our Tapway Account:
   • URL: https://acloudguru.com/
   • Email: training@gotapway.com
   • Password: Tapway@123
3. Discuss with your supervisor/HOD for training availability and book your Google Calendar
4. Finish the training and download certificate, then send to HR for documentation` },
      { id: 'website', title: 'Tapway Website', type: 'document', content: `💡 Tapway Official Website

https://gotapway.com/

Visit our official website to learn more about:
• Our products and solutions (PeopleTrack, VehicleTrack, StoreTrack)
• Company background and mission
• Latest news and updates
• Contact information
• Career opportunities` },
      { id: 'social-media', title: 'Social Media', type: 'link' },
      { id: 'aws-cert', title: 'AWS Certification Guideline', type: 'document', content: `AWS Certification Guideline

Refer to the Training and Development policy (Section 6 of Employee Handbook):

Training Course or Certification Program
• The employee will have to sign a bonded agreement with the company when attending any Training Courses or Certification Program sponsored by the company.

Course Value | Bonded Period
Less than RM 10,000 | 12 months
RM 10,001 – RM 20,000 | 24 months
More than RM 20,000 | 36 months

• In the event the employee violates the terms of the Agreement by not continuing employment with the Company for the period stipulated herein, then he/she shall pay back the full amount of the training course to the Company.

Training Module
• The training cost must be less than RM 5,000 and does not provide any certificate.
• No bonded agreement required.` },
    ],
  },
  {
    id: 'policies',
    title: 'Company Policies',
    icon: Shield,
    topics: [
      { id: 'code-conduct', title: 'Code of Conduct', type: 'document', content: `Code of Conduct

Working Hours
Monday–Friday: 8:00am–4:00pm or 9:00am–5:00pm
Saturday & Sunday: Rest Day
Lunch Break: Flexible 1 hour
Friday (Male Muslim): 12:30pm–2:30pm

Flexible Work Arrangements
• Employees are entitled to work remotely (WFH) for 3 days a week, with mandatory office attendance on 2 specific days.
• Employees may formally apply for Flexible Work Arrangements pursuant to Section 60P and 60Q of the Employment Act.

Communication Channels
• Slack: Main channel for work communication. Profile picture required. Status must be online during working hours.
• WhatsApp: Semi-formal channel.
• Company Email: Gmail Tapway Team. Personal company email provided upon enrollment.

Business Attire
• Employees must at all times appear neat and dignified in casual and suitable attire.
• When dealing with customers, present a clean, neat and professional appearance.

Confidential Information
• All employees shall not divulge confidential Company information during or after employment.
• The Company shall take legal action in any situation involving unauthorized disclosure.

Acts of Misconduct
• Habitual lateness, breach of trust, rude behaviour, insubordination, AWOL, theft, sexual harassment, gambling, sleeping on duty, unauthorized use of company vehicles/equipment.` },
      { id: 'leave-rules', title: 'Leave Rule & Categories', type: 'document', content: `Leave Rules & Categories

Annual Leave
• Confirmed employees: 18 days per year
• Carry forward: Maximum 10 days (5 usable until March following year, remaining must be used in January)
• Half Day Leave: Morning (8am–12pm) or Afternoon (2pm–5pm)

Sick Leave (per Employment Act 1955)
Less than 2 years: 14 days/year
2–5 years: 18 days/year
5+ years: 22 days/year
Hospitalization: 60 days (additional)

Other Paid Leave
Compassionate: 3 consecutive working days — All (natural disaster, death of spouse/child/siblings/parents/in-laws)
Marriage: 3 consecutive working days — First marriage only
Paternity: 7 consecutive working days — Male employees
Maternity: Per Employment Act — Female employees
Work Anniversary: 1 day (anniversary month) — Permanent & confirmed
Birthday: 1 day (birthday month) — Permanent & confirmed

Probation Leave (Pro-rated)
• Annual Leave: 1.5 days/completed month
• Sick Leave: 1 day/completed month
• Compassionate Leave: 1 day/occasion/year

Leave Application Rules
• < 5 days: Apply 3 days before, HOD approval required
• > 5 days: Apply 5 days before, HOD approval required
• Unplanned: Can apply same day, must have legitimate reason and proof
• Leave without approval = AWOL` },
      { id: 'wages', title: 'Wages', type: 'document', content: `Wages

Payment
• Method: Bank transfer to employee's preferred account
• Date: Before/On the 26th of every month (or last working day if 26th falls on rest day/public holiday)

Statutory Contributions
EPF (Local): Employee 11%, Employer 13%
EPF (Foreign): Employee 2%, Employer 2%
SOCSO + EIS: As per Act (both)
Income Tax: PCB deduction (employee only)

Salary Increment
• Must be employed for more than 6 months upon increment date
• Pro-rated increment for 6–12 months of employment
• Based on last withdrawn basic salary (without allowance & commissions)

Pro-rated Salary
• Based on working days calculation: Period = total days in month (including weekends)
• Formula: [Basic Salary / Total Days] × Working Days` },
      { id: 'overtime', title: 'Overtime (OT)', type: 'document', content: `Overtime (OT)

Eligibility
• Basic salary below RM 4,000: Entitled to OT pay
• Basic salary above RM 4,000: Not entitled, but may apply for TOIL/Compensatory Time with Senior Management + HR + CEO approval

Rate Calculations
• Ordinary Rate of Pay (ORP) = Basic Salary / 26 days
• Hourly Rate (HRy) = ORP / 8 hours

OT Rates (Salary < RM 4,000)
Weekday (7pm–7am next day): HRy × 1.5
Rest day (≤ 4 hours): ORP × 0.5
Rest day (4–8 hours): ORP × 1
Rest day (> 8 hours): ORP + (HRy × 2)
Public holiday (≤ 8 hours): ORP × 2
Public holiday (> 8 hours): ORP × 3

Procedure
1. Employee informs HOD for approval
2. HOD assesses urgency, gets CTO/CEO approval
3. HOD informs HR for formality
4. All OT must be submitted by 20th of the month` },
      { id: 'commission', title: 'Commission', type: 'document', content: `Commission

Eligibility
• Only employees from Business Development department are entitled to Commissions
• Both probation and confirmed staff are eligible

Payment Release Process
1. Finance department provides the Commissions Tracker
2. Finance registers confirmed deals with approved Purchase Order (PO)
3. HR communicates with Finance to get payment updates for each registered deal` },
      { id: 'expenses', title: 'Claimable Expenses', type: 'document', content: `Claimable Expenses

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
                            <span style={{ opacity: 0.7 }}>
                              {topic.type === 'pdf' && '📕'}
                              {topic.type === 'video' && '🎥'}
                              {topic.type === 'link' && '🔗'}
                              {topic.type === 'image' && '🖼️'}
                              {topic.type === 'document' && '📄'}
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
