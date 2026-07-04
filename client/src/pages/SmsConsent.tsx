const disclosure = "By selecting ‘Agree & send code,’ you agree to receive transactional text messages from HELD by BLDG.chat at the number provided. Messages may include verification codes, account and security notices, service confirmations, appointment reminders, provider coordination, pickup and delivery updates, payment notices, and customer support. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase.";

export default function SmsConsent() {
  return <main style={{minHeight:"100vh",background:"#171512",color:"#f7f0e5",padding:"64px 24px",fontFamily:"Inter,system-ui,sans-serif"}}>
    <section style={{maxWidth:760,margin:"0 auto"}}>
      <p style={{color:"#c9a96e",letterSpacing:".14em",textTransform:"uppercase",fontSize:12}}>HELD by BLDG.chat</p>
      <h1 style={{fontFamily:"Georgia,serif",fontWeight:400,fontSize:"clamp(42px,8vw,72px)",margin:"18px 0"}}>HELD SMS Consent</h1>
      <p style={{fontSize:18,lineHeight:1.6,color:"#d8d0c4"}}>Residents voluntarily enroll in transactional text messaging during HELD account onboarding.</p>
      <ol style={{display:"grid",gap:16,paddingLeft:22,margin:"42px 0",fontSize:16,lineHeight:1.6}}>
        <li>Resident enters a mobile number.</li><li>Resident reviews the full SMS disclosure and selects “Agree &amp; send code.”</li><li>HELD records consent and sends a one-time verification code.</li>
      </ol>
      <div style={{border:"1px solid #6f5a36",borderRadius:16,padding:28,background:"#211e19"}}>
        <h2 style={{marginTop:0,fontFamily:"Georgia,serif",fontWeight:400}}>Disclosure shown before any text is sent</h2>
        <p style={{lineHeight:1.75,color:"#e6ddd0"}}>{disclosure}</p>
        <p style={{display:"flex",gap:24,flexWrap:"wrap"}}><a style={{color:"#dfbd7e"}} href="https://www.bldg.chat/termsofuse" target="_blank" rel="noreferrer">Terms of Use</a><a style={{color:"#dfbd7e"}} href="https://www.bldg.chat/privacypolicy" target="_blank" rel="noreferrer">Privacy Policy</a></p>
      </div>
      <p style={{marginTop:32,color:"#d8d0c4"}}>Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase.</p>
      <p style={{marginTop:22}}>Support: <a style={{color:"#dfbd7e"}} href="mailto:support@bldg.chat">support@bldg.chat</a> or <a style={{color:"#dfbd7e"}} href="tel:+13238074661">(323) 807-4661</a></p>
    </section>
  </main>;
}
