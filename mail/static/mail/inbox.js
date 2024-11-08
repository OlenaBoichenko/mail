document.addEventListener('DOMContentLoaded', function() {
  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // Handle form submission for composing email
  document.querySelector('#compose-form').addEventListener('submit', send_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  const email_view = document.querySelector('#email-view');
  if (email_view) {
    email_view.style.display = 'none';
  }

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function send_email(event) {
  event.preventDefault(); 

  // Get values from the form
  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  // Send POST request to /emails endpoint
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: recipients,
      subject: subject,
      body: body
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error sending email');
    }
    return response.json();
  })
  .then(result => {
    load_mailbox('sent');
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  const email_view = document.querySelector('#email-view');
  if (email_view) {
    email_view.style.display = 'none';
  }

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Fetch the emails for the selected mailbox
  fetch(`/emails/${mailbox}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Error loading mailbox');
      }
      return response.json();
    })
    .then(emails => {
      // Display each email in the mailbox
      emails.forEach(email => {
        const email_div = document.createElement('div');
        email_div.className = 'email-item';
        email_div.innerHTML = `<strong>${email.sender}</strong> ${email.subject} <span class="timestamp">${email.timestamp}</span>`;
        
        // Set background color based on read status
        email_div.style.backgroundColor = email.read ? 'lightgray' : 'white';
        email_div.style.border = '1px solid black';
        email_div.style.padding = '10px';
        email_div.style.margin = '5px';
        email_div.addEventListener('click', () => {
          load_email(email.id);
          // After loading the email, mark it as read
          if (!email.read) {
            fetch(`/emails/${email.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                read: true
              })
            }).then(() => {
              // Update the background color to reflect the read status
              email_div.style.backgroundColor = 'lightgray';
            });
          }
        });
        document.querySelector('#emails-view').append(email_div);
      });
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

function load_email(email_id) {
  // Show the email view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  let email_view = document.querySelector('#email-view');
  if (!email_view) {
    email_view = document.createElement('div');
    email_view.id = 'email-view';
    document.body.appendChild(email_view);
  }
  email_view.style.display = 'block';

  // Clear previous email content
  email_view.innerHTML = '';

  // Fetch the email details
  fetch(`/emails/${email_id}`)
    .then(response => response.json())
    .then(email => {
      if (!email.read) {
        fetch(`/emails/${email_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            read: true
          })
        });
      }
      // Display the email details
      email_view.innerHTML = `
        <strong>From:</strong> ${email.sender}<br>
        <strong>To:</strong> ${email.recipients.join(', ')}<br>
        <strong>Subject:</strong> ${email.subject}<br>
        <strong>Timestamp:</strong> ${email.timestamp}<br>
        <button class="btn btn-sm btn-outline-primary" id="reply">Reply</button>
        <button class="btn btn-sm btn-outline-secondary" id="archive">${email.archived ? 'Unarchive' : 'Archive'}</button>
        <hr>
        <p>${email.body}</p>
      `;

      // Add archive/unarchive functionality
      document.querySelector('#archive').addEventListener('click', () => {
        fetch(`/emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
        archived: !email.archived
      })
  })
      .then(() => {
    // After archiving or unarchiving, load the inbox
    load_mailbox('inbox');
  });
});

      // Add reply functionality
      document.querySelector('#reply').addEventListener('click', () => reply_email(email));
    });
}

function reply_email(email) {
  // Show compose view and hide other views
  compose_email();

  // Pre-fill composition fields
  document.querySelector('#compose-recipients').value = email.sender;
  document.querySelector('#compose-subject').value = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
  document.querySelector('#compose-body').value = `On ${email.timestamp}, ${email.sender} wrote:
${email.body}
`;
}
