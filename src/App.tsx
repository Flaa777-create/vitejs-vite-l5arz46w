import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TelaCliente />} />
        <Route path="/login" element={<TelaAuth />} />
        <Route path="/painel" element={<TelaProprietaria />} />
      </Routes>
    </BrowserRouter>
  );
}

// ==========================================
// 1. TELA DA CLIENTE (Link: seudominio.com/)
// ==========================================
function TelaCliente() {
  const navigate = useNavigate();
  const [nomeCliente, setNomeCliente] = useState('');
  const [whatsappCliente, setWhatsappCliente] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [carregando, setCarregando] = useState(false);

  const confirmarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const dataFormatadaISO = new Date(dataHora).toISOString();
      const { error } = await supabase
        .from('agendamentos')
        .insert([{ nome_cliente: nomeCliente, whatsapp_cliente: whatsappCliente, data_hora: dataFormatadaISO, status_pagamento: 'Pendente' }]);

      if (error) throw error;
      alert(`Agendamento salvo! ${nomeCliente}, faça o PIX de R$ 20,00 para confirmar.`);
    } catch (error: any) {
      alert('Erro ao agendar: ' + error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#121214', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px', color: '#fff' }}>
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <button onClick={() => navigate('/login')} style={{ backgroundColor: 'transparent', border: '1px solid #333', color: '#888', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
          Área da Proprietária
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#fff0f3', borderRadius: '30px', padding: '30px 20px', color: '#333', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#ff4a7d', textAlign: 'center', margin: '0 0 5px 0', fontSize: '24px' }}>✨ Studio ✨</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', margin: '0 0 20px 0' }}>Agende seu momento de beleza</p>
        <form onSubmit={confirmarAgendamento}>
          <div style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #ffccd5', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>Selecione o Serviço</div>
              <div style={{ fontSize: '14px', color: '#ff4a7d', fontWeight: 'bold', marginTop: '4px' }}>R$ 0,00</div>
            </div>
            <input type="radio" defaultChecked style={{ accentColor: '#ff4a7d', width: '18px', height: '18px' }} />
          </div>

          <div style={{ marginBottom: '15px', color: '#333', fontSize: '14px' }}>
            Escolha o Dia e Horário:
            <input type="datetime-local" required value={dataHora} onChange={(e) => setDataHora(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box', marginTop: '5px' }} />
          </div>

          <div style={{ marginBottom: '15px', color: '#333', fontSize: '14px' }}>
            Seus Dados:
            <input type="text" placeholder="Seu Nome Completo" required value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box', margin: '5px 0 8px 0' }} />
            <input type="tel" placeholder="Seu WhatsApp (com DDD)" required value={whatsappCliente} onChange={(e) => setWhatsappCliente(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={carregando} style={{ width: '100%', padding: '15px', backgroundColor: '#ff4a7d', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            {carregando ? 'Agendando...' : 'AGENDAR'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 2. TELA DE LOGIN / CADASTRO (Link: seudominio.com/login)
// ==========================================
function TelaAuth() {
  const navigate = useNavigate();
  const [modoAuth, setModoAuth] = useState<'cadastro' | 'login'>('cadastro');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const lidarComAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      if (modoAuth === 'cadastro') {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password: senha,
          options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        alert('Conta criada com sucesso! Verifique seu e-mail para confirmar.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate('/painel');
      }
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#121214', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px', color: '#fff' }}>
      <button onClick={() => navigate('/')} style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: '#29292e', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }}>← Voltar para a Agenda</button>
      
      <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#fff0f3', borderRadius: '30px', padding: '30px 20px', color: '#333', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#ff4a7d', textAlign: 'center', margin: '0 0 5px 0', fontSize: '24px' }}>GlowAgenda Business</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', margin: '0 0 25px 0' }}>{modoAuth === 'cadastro' ? 'Crie sua conta em minutos' : 'Acesse sua conta'}</p>
        
        <form onSubmit={lidarComAuth}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>E-mail Profissional</label>
            <input type="email" placeholder="" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>Sua Senha</label>
            <input type="password" placeholder="" required value={senha} onChange={(e) => setSenha(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={carregando} style={{ width: '100%', padding: '15px', backgroundColor: '#ff4a7d', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            {carregando ? 'Processando...' : modoAuth === 'cadastro' ? 'Criar Minha Conta' : 'Entrar na Conta'}
          </button>
        </form>

        <p onClick={() => setModoAuth(modoAuth === 'cadastro' ? 'login' : 'cadastro')} style={{ textAlign: 'center', color: '#ff4a7d', fontSize: '14px', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
          {modoAuth === 'cadastro' ? 'Já tenho conta? Entrar' : 'Não tem conta? Cadastrar-se'}
        </p>
      </div>
    </div>
  );
}

// ==========================================
// 3. TELA DA PROPRIETÁRIA (Link: seudominio.com/painel)
// ==========================================
function TelaProprietaria() {
  const navigate = useNavigate();
  const [nomeSalao, setNomeSalao] = useState('');
  const [nomeServico, setNomeServico] = useState('');
  const [precoServico, setPrecoServico] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login');
    });
  }, [navigate]);

  const salvarDadosDona = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const { error } = await supabase
        .from('servicos')
        .insert([{ nome_servico: nomeServico, preco: parseFloat(precoServico), duracao_minutos: 60 }]);

      if (error) throw error;
      alert(`Sucesso! O serviço "${nomeServico}" foi salvo.`);
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#121214', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px', color: '#fff' }}>
      <div style={{ position: 'absolute', top: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={() => navigate('/')} style={{ backgroundColor: '#29292e', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }}>Ver Tela da Cliente</button>
        <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} style={{ backgroundColor: '#ff4a7d', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }}>Sair</button>
      </div>

      <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#ffffff', borderRadius: '30px', padding: '30px 20px', color: '#333', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#ff4a7d', textAlign: 'center', margin: '0 0 20px 0', fontSize: '22px' }}>Configurar meu Studio</h2>
        <form onSubmit={salvarDadosDona}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>Nome do Salão/Studio</label>
            <input type="text" value={nomeSalao} onChange={(e) => setNomeSalao(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>Nome do serviço</label>
            <input type="text" value={nomeServico} onChange={(e) => setNomeServico(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>Preço (R$)</label>
            <input type="number" value={precoServico} onChange={(e) => setPrecoServico(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={carregando} style={{ width: '100%', padding: '15px', backgroundColor: '#ff4a7d', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            {carregando ? 'Salvando...' : 'Salvar e Publicar Agenda'}
          </button>
        </form>
      </div>
    </div>
  );
}