// test-resend.ts
import { Resend } from 'resend';

async function testResend() {
    const resend = new Resend('re_LH3RMZsj_QJeFLYhhd2wwrfijvcG3f2fs');

    const testEmails = [
        'noreply@canadev.my.id',  // Format: email saja
        'Onboarding Resend <noreply@canadev.my.id>',  // Format: Name <email>
    ];

    for (const fromEmail of testEmails) {
        console.log(`Testing with from: "${fromEmail}"`);

        try {
            const { data, error } = await resend.emails.send({
                from: fromEmail,
                to: ['nabilkencana20@gmail.com'],  // Email testing Resend
                subject: 'Test Resend Format',
                html: '<p>Testing email format</p>',
                text: 'Testing email format',
            });

            if (error) {
                console.error(`Error with "${fromEmail}":`, error);
            } else {
                console.log(`Success with "${fromEmail}". Email ID: ${data.id}`);
            }
        } catch (err) {
            console.error(`Exception with "${fromEmail}":`, err.message);
        }

        console.log('---');
    }
}

testResend();