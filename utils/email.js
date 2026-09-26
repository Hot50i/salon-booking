
require("dotenv").config();

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const transporter = {
    async sendMail(options) {

        try {

            const { data, error } = await resend.emails.send({
                from: options.from,
                to: [options.to],
                subject: options.subject,
                text: options.text,
                html: options.html
            });

            if (error) {
                console.log("Resend email error:", error);
                throw error;
            }

            console.log("Email sent successfully:", data);

            return data;

        } catch (error) {

            console.log("Email sending error:", error);

            throw error;
        }
    }
};

module.exports = transporter;




