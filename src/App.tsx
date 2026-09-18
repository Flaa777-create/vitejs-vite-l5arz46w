import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TelaCliente />} />
      <Route path="/login" element={<TelaAuth />} />
      <Route path="/painel" element={<TelaProprietaria />} />
      <Route path="/redefinir-senha" element={<TelaRedefinirSenha />} />
      <Route path="/assinatura-pendente" element={<TelaAssinaturaPendente />} />
      <Route path="*" element={<TelaCliente />} />
    </Routes>
  );
}

// ==========================================
// 1. TELA DA CLIENTE (PUBLICA / CATÁLOGO)
// ==========================================
export function TelaCliente() {
  const [nomeCliente, setNomeCliente] = useState('');
  const [whatsappCliente, setWhatsappCliente] = useState('');
  
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horaSelecionada, setHoraSelecionada] = useState('');
  
  const [carregando, setCarregando] = useState(false);
  const [servicosDoSalao, setServicosDoSalao] = useState<any[]>([]);
  const [servicosSelecionados, setServicosSelecionados] = useState<any[]>([]);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);

  const [mostrarModalPix, setMostrarModalPix] = useState(false);
  const [pixCopiaCola, setPixCopiaCola] = useState('');
  const [valorSinal] = useState(20.00);

  const [chavePixSinal, setChavePixSinal] = useState('Chave PIX não configurada');
  const [cobrarSinalConfig, setCobrarSinalConfig] = useState(false);
  const [salonOwnerId, setSalonOwnerId] = useState<string | null>(null);

  const [gradeHorarios, setGradeHorarios] = useState<string[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [funcionarioSelecionada, setFuncionarioSelecionada] = useState<string>('');

  const [confSalao, setConfSalao] = useState({
    abertura: '08:00',
    fechamento: '18:00',
    almocoInicio: '12:00',
    almocoFim: '13:00',
    whatsappProfissional: '5511999999999'
  });

  const carregarDadosPublicos = useCallback(async () => {
    // Carrega configurações globais da tabela salons (primeiro salão ou ativo)
    const { data: salonData } = await supabase.from('salons').select('*').limit(1).single();
    if (salonData) {
      setSalonOwnerId(salonData.owner_id || null);
      setConfSalao({
        abertura: salonData.hora_abertura || '08:00',
        fechamento: salonData.hora_fechamento || '18:00',
        almocoInicio: salonData.almoco_inicio || '12:00',
        almocoFim: salonData.almoco_fim || '13:00',
        whatsappProfissional: salonData.whatsapp_profissional || '5511999999999'
      });
      if (salonData.chave_pix_sinal) setChavePixSinal(salonData.chave_pix_sinal);
      if (salonData.cobrar_sinal !== undefined) setCobrarSinalConfig(Boolean(salonData.cobrar_sinal));

      // Carrega serviços vinculados à dona desse salão (ou geral se fallback)
      let queryServ = supabase.from('servicos').select('*').order('nome_servico', { ascending: true });
      if (salonData.owner_id) {
        queryServ = queryServ.eq('owner_id', salonData.owner_id);
      }
      const { data: servs } = await queryServ;
      if (servs) setServicosDoSalao(servs);

      // Carrega profissionais vinculados à dona
      let queryFunc = supabase.from('funcionarios').select('*');
      if (salonData.owner_id) {
        queryFunc = queryFunc.eq('owner_id', salonData.owner_id);
      }
      const { data: funcs } = await queryFunc;
      if (funcs) setFuncionarios(funcs);
    }
  }, []);

  useEffect(() => {
    carregarDadosPublicos();
  }, [carregarDadosPublicos]);

  const toggleServico = (serv: any) => {
    setServicosSelecionados(prev => {
      const existe = prev.find(s => s.id === serv.id);
      if (existe) {
        return prev.filter(s => s.id !== serv.id);
      } else {
        return [...prev, serv];
      }
    });
  };

  const duracaoTotal = servicosSelecionados.reduce((acc, s) => acc + (Number(s.duracao_minutos) || 60), 0);
  const precoTotal = servicosSelecionados.reduce((acc, s) => acc + (Number(s.preco) || 0), 0);

  useEffect(() => {
    if (servicosSelecionados.length === 0) {
      setGradeHorarios([]);
      setHoraSelecionada('');
      return;
    }
    const [hAbertura, mAbertura] = confSalao.abertura.split(':').map(Number);
    const [hFechamento, mFechamento] = confSalao.fechamento.split(':').map(Number);
    const inicioAlmoco = confSalao.almocoInicio;
    const fimAlmoco = confSalao.almocoFim;

    let horaAtual = new Date();
    horaAtual.setHours(hAbertura, mAbertura, 0, 0);
    const horaFim = new Date();
    horaFim.setHours(hFechamento, mFechamento, 0, 0);

    const horariosGerados: string[] = [];
    while (horaAtual < horaFim) {
      const horasStr = String(horaAtual.getHours()).padStart(2, '0');
      const minutosStr = String(horaAtual.getMinutes()).padStart(2, '0');
      const formatoHora = `${horasStr}:${minutosStr}`;
      
      if (formatoHora >= inicioAlmoco && formatoHora < fimAlmoco) {
        horaAtual.setMinutes(horaAtual.getMinutes() + 30);
        continue;
      }
      horariosGerados.push(formatoHora);
      horaAtual.setMinutes(horaAtual.getMinutes() + 30);
    }
    setGradeHorarios(horariosGerados);
    setHoraSelecionada('');
  }, [servicosSelecionados, duracaoTotal, confSalao]);

  useEffect(() => {
    if (!dataSelecionada) return;
    const buscarHorariosOcupados = async () => {
      let queryAgend = supabase.from('agendamentos').select('data_hora, owner_id');
      if (salonOwnerId) queryAgend = queryAgend.eq('owner_id', salonOwnerId);
      
      const { data } = await queryAgend;
      if (data) {
        const ocupados = data
          .map(agend => { try { return new Date(agend.data_hora); } catch { return null; } })
          .filter((dataAgend): dataAgend is Date => {
            if (!dataAgend) return false;
            return dataAgend.toISOString().split('T')[0] === dataSelecionada;
          })
          .map(dataAgend => {
            const h = String(dataAgend.getHours()).padStart(2, '0');
            const m = String(dataAgend.getMinutes()).padStart(2, '0');
            return `${h}:${m}`;
          });
        setHorariosOcupados(ocupados);
      }
    };
    buscarHorariosOcupados();
    setHoraSelecionada(''); 
  }, [dataSelecionada, salonOwnerId]);

  const confirmarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (servicosSelecionados.length === 0 || !dataSelecionada || !horaSelecionada) return;
    
    setCarregando(true);
    try {
      const dataHoraCompleta = new Date(`${dataSelecionada}T${horaSelecionada}:00`);
      const nomesServs = servicosSelecionados.map(s => s.nome_servico).join(', ');
      
      const funcObj = funcionarios.find(f => f.id === funcionarioSelecionada);
      const nomeFuncStr = funcObj ? ` | Prof: ${funcObj.nome_funcionario}` : '';
      const nomeComServico = `${nomeCliente} (${nomesServs} - R$ ${precoTotal.toFixed(2)}${nomeFuncStr})`;

      const payloadAgendamento: any = { 
        nome_cliente: nomeComServico, 
        whatsapp_cliente: whatsappCliente, 
        data_hora: dataHoraCompleta.toISOString(), 
        status_pagamento: 'Pendente', 
        status: 'pendente',
        owner_id: salonOwnerId
      };

      if (funcionarioSelecionada) {
        payloadAgendamento.funcionario_id = funcionarioSelecionada;
      }

      const { error } = await supabase.from('agendamentos').insert([payloadAgendamento]);
      if (error) throw error;

      setPixCopiaCola(chavePixSinal);
      setMostrarModalPix(true);
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setCarregando(false);
    }
  };

  const enviarMensagemWhatsapp = () => {
    const dataFormatada = dataSelecionada.split('-').reverse().join('/');
    const nomesServs = servicosSelecionados.map(s => s.nome_servico).join(', ');
    const funcObj = funcionarios.find(f => f.id === funcionarioSelecionada);
    
    const nomeProfDestino = funcObj ? funcObj.nome_funcionario : 'Profissional';
    const textoMensagem = cobrarSinalConfig
      ? `Olá, ${nomeProfDestino}! Me chamo ${nomeCliente}. Acabei de realizar o Pix do sinal de R$ ${valorSinal.toFixed(2)} para a chave (${chavePixSinal}). Agendei os serviços (*${nomesServs}*) para o dia *${dataFormatada}* às *${horaSelecionada}*. Segue o comprovante!`
      : `Olá, ${nomeProfDestino}! Me chamo ${nomeCliente}. Agendei os serviços (*${nomesServs}*) para o dia *${dataFormatada}* às *${horaSelecionada}* pelo GlowAgenda! Total: R$ ${precoTotal.toFixed(2)}`;
    
    let numeroDona = confSalao.whatsappProfissional.replace(/\D/g, '');
    if (numeroDona.length === 11 || numeroDona.length === 10) numeroDona = `55${numeroDona}`;

    const url = `https://wa.me/${numeroDona}?text=${encodeURIComponent(textoMensagem)}`;
    window.open(url, '_blank');
  };

  const fecharEFecharCampos = () => {
    setMostrarModalPix(false); 
    setNomeCliente(''); 
    setWhatsappCliente(''); 
    setDataSelecionada(''); 
    setHoraSelecionada('');
    setServicosSelecionados([]);
  };

  return (
    <div style={{ backgroundColor: '#121214', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px', color: '#fff' }}>
      <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#fff0f3', borderRadius: '30px', padding: '30px 20px', color: '#333', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#ff4a7d', textAlign: 'center', margin: '0 0 5px 0', fontSize: '24px' }}>✨ Studio ✨</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', margin: '0 0 20px 0' }}>Agende seus momentos de beleza</p>
        
        <form onSubmit={confirmarAgendamento}>
          <div style={{ marginBottom: '10px', color: '#333', fontSize: '14px', fontWeight: 'bold' }}>Selecione o(s) Serviço(s):</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '160px', overflowY: 'auto', marginBottom: '15px' }}>
            {servicosDoSalao.map((serv) => {
              const selecionado = servicosSelecionados.some(s => s.id === serv.id);
              return (
                <label key={serv.id} onClick={() => toggleServico(serv)} style={{ backgroundColor: '#ffffff', padding: '10px 15px', borderRadius: '12px', border: selecionado ? '2px solid #ff4a7d' : '1px solid #ffccd5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{serv.nome_servico}</div>
                    <div style={{ fontSize: '12px', color: '#ff4a7d', fontWeight: 'bold' }}>R$ {serv.preco ? Number(serv.preco).toFixed(2) : '0.00'} ({serv.duracao_minutos} min)</div>
                  </div>
                  <input type="checkbox" checked={selecionado} onChange={() => {}} style={{ accentColor: '#ff4a7d' }} />
                </label>
              );
            })}
          </div>

          {servicosSelecionados.length > 0 && (
            <div style={{ backgroundColor: '#ffeef3', padding: '8px 12px', borderRadius: '8px', marginBottom: '15px', fontSize: '12px', color: '#ff4a7d', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
              <span>Total: R$ {precoTotal.toFixed(2)}</span>
              <span>Duração: ~{duracaoTotal} min</span>
            </div>
          )}

          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
              Selecionar Profissional:
            </label>
            <select 
              value={funcionarioSelecionada}
              onChange={(e) => setFuncionarioSelecionada(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ff4a7d', backgroundColor: '#fff', color: '#333', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="">-- Escolher profissional --</option>
              {funcionarios.map((func) => (
                <option key={func.id} value={func.id}>
                  {func.nome_funcionario} {func.especialidade ? `(${func.especialidade})` : ''}
                </option>
              ))}
            </select>
          </div> 

          <div style={{ marginBottom: '15px', color: '#333', fontSize: '14px' }}>
            1. Escolha o Dia:
            <input type="date" required value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', marginTop: '5px', boxSizing: 'border-box' }} />
          </div>

          {dataSelecionada && servicosSelecionados.length > 0 && (
            <div style={{ marginBottom: '20px', color: '#333', fontSize: '14px' }}>
              2. Escolha o Horário Disponível:
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                {gradeHorarios.map((hora) => {
                  const estaOcupado = horariosOcupados.includes(hora);
                  const estaSelecionado = horaSelecionada === hora;
                  return (
                    <button key={hora} type="button" disabled={estaOcupado} onClick={() => setHoraSelecionada(hora)} style={{ padding: '10px', borderRadius: '8px', border: estaOcupado ? '1px solid #ddd' : estaSelecionado ? '2px solid #ff4a7d' : '1px solid #ffccd5', backgroundColor: estaOcupado ? '#e9e9e9' : estaSelecionado ? '#ff4a7d' : '#fff', color: estaOcupado ? '#aaa' : estaSelecionado ? '#fff' : '#333', textDecoration: estaOcupado ? 'line-through' : 'none', cursor: estaOcupado ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                      {hora}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '15px', color: '#333', fontSize: '14px' }}>
            3. Seus Dados:
            <input type="text" placeholder="Seu Nome Completo" required value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', margin: '5px 0 8px 0', boxSizing: 'border-box' }} />
            <input type="tel" placeholder="Seu WhatsApp" required value={whatsappCliente} onChange={(e) => setWhatsappCliente(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={carregando || !horaSelecionada || servicosSelecionados.length === 0} style={{ width: '100%', padding: '15px', backgroundColor: '#ff4a7d', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', opacity: (carregando || !horaSelecionada || servicosSelecionados.length === 0) ? 0.6 : 1 }}>
            {carregando ? 'Agendando...' : 'CONFIRMAR AGENDAMENTO'}
          </button>
        </form>

        {mostrarModalPix && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', boxSizing: 'border-box' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '30px 20px', maxWidth: '360px', width: '100%', color: '#333', textAlign: 'center', boxShadow: '0px 10px 40px rgba(0,0,0,0.5)' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>💸</div>
              <h3 style={{ color: '#ff4a7d', margin: '0 0 10px 0', fontSize: '20px', fontWeight: 'bold' }}>Quase lá, {nomeCliente}!</h3>
              
              {cobrarSinalConfig ? (
                <>
                  <p style={{ fontSize: '14px', color: '#666', margin: '0 0 20px 0' }}>Para confirmar seu horário no dia {dataSelecionada.split('-').reverse().join('/')} às {horaSelecionada}, faça o pagamento do sinal:</p>
                  
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>VALOR DO SINAL</span>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a', marginTop: '2px' }}>R$ {valorSinal.toFixed(2)}</div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <input 
                      type="text" 
                      readOnly 
                      value={pixCopiaCola} 
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ccc', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#f9f9f9', textAlign: 'center', boxSizing: 'border-box', userSelect: 'all' }} 
                    />
                    <button 
                      type="button"
                      onClick={() => { 
                        navigator.clipboard.writeText(pixCopiaCola); 
                        alert('Chave PIX do salão copiada!'); 
                      }} 
                      style={{ width: '100%', padding: '12px', backgroundColor: '#1ebd60', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
                    >
                      📋 COPIAR CHAVE PIX
                    </button>
                    <p style={{ fontSize: '11px', color: '#666', marginTop: '10px', lineHeight: '1.4' }}>
                      Faça o Pix de <strong>exatamente R$ {valorSinal.toFixed(2)}</strong> e clique abaixo para enviar o comprovante para a profissional.
                    </p>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: '14px', color: '#666', margin: '0 0 20px 0' }}>Seu horário no dia {dataSelecionada.split('-').reverse().join('/')} às {horaSelecionada} foi registrado com sucesso! Envie a confirmação no WhatsApp abaixo.</p>
              )}

              <button onClick={enviarMensagemWhatsapp} style={{ width: '100%', padding: '12px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                💬 ENVIAR NO WHATSAPP
              </button>

              <button onClick={fecharEFecharCampos} style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', border: '1px solid #ccc', color: '#666', borderRadius: '12px', fontSize: '13px', cursor: 'pointer' }}>
                Fechar e Concluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 2. AUTH, REDEFINIR E BLOQUEIO DE ASSINATURA
// ==========================================
export function TelaAuth() {
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
        const { data, error } = await supabase.auth.signUp({ email, password: senha });
        if (error) throw error;
        // Cria registro inicial em salons caso não exista
        if (data.user) {
          await supabase.from('salons').upsert([{ owner_id: data.user.id, subscription_status: 'active' }], { onConflict: 'owner_id' });
        }
        alert('Conta criada com sucesso!');
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

  const recuperarSenha = async () => {
    if (!email) {
      alert('Por favor, preencha o e-mail primeiro.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/redefinir-senha',
      });
      if (error) throw error;
      alert('E-mail de recuperação enviado!');
    } catch (error: any) {
      alert('Erro: ' + error.message);
    }
  };

  return (
    <div style={{ backgroundColor: '#121214', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px', color: '#fff' }}>
      <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#fff0f3', borderRadius: '30px', padding: '30px 20px', color: '#333', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#ff4a7d', textAlign: 'center', margin: '0 0 5px 0', fontSize: '26px', fontWeight: 'bold' }}>✨ GlowAgenda!</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', margin: '0 0 25px 0' }}>{modoAuth === 'cadastro' ? 'Crie sua conta em minutos' : 'Acesse sua conta'}</p>
        
        <form onSubmit={lidarComAuth}>
          <div style={{ marginBottom: '15px' }}>
            E-mail Profissional
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box', marginTop: '5px' }} />
          </div>
          
          <div style={{ marginBottom: '25px' }}>
            Sua Senha
            <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box', marginTop: '5px' }} />
          </div>

          <button type="submit" disabled={carregando} style={{ width: '100%', padding: '15px', backgroundColor: '#ff4a7d', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            {carregando ? 'Processando...' : modoAuth === 'cadastro' ? 'Criar Minha Conta' : 'Entrar na Conta'}
          </button>
        </form>

        {modoAuth === 'login' && (
          <p onClick={recuperarSenha} style={{ textAlign: 'center', color: '#666', fontSize: '13px', marginTop: '15px', cursor: 'pointer', textDecoration: 'underline' }}>
            Esqueceu sua senha?
          </p>
        )}

        <p onClick={() => setModoAuth(modoAuth === 'cadastro' ? 'login' : 'cadastro')} style={{ textAlign: 'center', color: '#ff4a7d', fontSize: '14px', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
          {modoAuth === 'cadastro' ? 'Já tenho conta? Entrar' : 'Não tem conta? Cadastrar-se'}
        </p>
      </div>
    </div>
  );
}

export function TelaRedefinirSenha() {
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const atualizarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      alert('Senha alterada com sucesso!');
      navigate('/login');
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#121214', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px', color: '#fff' }}>
      <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#fff0f3', borderRadius: '30px', padding: '30px 20px', color: '#333', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#ff4a7d', textAlign: 'center', margin: '0 0 5px 0', fontSize: '26px', fontWeight: 'bold' }}>✨ Nova Senha</h2>
        <form onSubmit={atualizarSenha}>
          <div style={{ marginBottom: '25px', marginTop: '15px' }}>
            Nova Senha
            <input type="password" required placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box', marginTop: '5px' }} />
          </div>
          <button type="submit" disabled={carregando} style={{ width: '100%', padding: '15px', backgroundColor: '#ff4a7d', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            {carregando ? 'Salvando...' : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function TelaAssinaturaPendente() {
  const navigate = useNavigate();
  const [simulandoAtivacao, setSimulandoAtivacao] = useState(false);

  const regularizarAssinaturaReal = async () => {
    setSimulandoAtivacao(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const res = await fetch('/api/create-mp-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: user.id,
          email: user.email,
          salonName: 'Meu Studio'
        })
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point; // Vai para o checkout do MP
      } else {
        alert(data.error || 'Erro ao gerar checkout');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSimulandoAtivacao(false);
    }
  };
  return (
    <div style={{ backgroundColor: '#121214', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px', color: '#fff' }}>
      <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#1f1215', border: '1px solid #dc2626', borderRadius: '30px', padding: '30px 20px', color: '#fff', textAlign: 'center', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
        <h2 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '22px' }}>Assinatura Pendente</h2>
        <p style={{ color: '#aaa', fontSize: '13px', lineHeight: '1.5', marginBottom: '25px' }}>
          O acesso ao seu painel de agendamentos foi pausado por inadimplência ou carência da mensalidade (R$ 69,90). Regularize para liberar sua agenda.
        </p>
        <button 
          onClick={regularizarAssinaturaMock} 
          disabled={simulandoAtivacao}
          style={{ width: '100%', padding: '15px', backgroundColor: '#1ebd60', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}
        >
          {simulandoAtivacao ? 'Processando Webhook...' : '💳 Regularizar e Liberar Acesso'}
        </button>
        <button 
          onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} 
          style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', border: '1px solid #444', color: '#ccc', borderRadius: '12px', fontSize: '13px', cursor: 'pointer' }}
        >
          Sair da Conta
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 3. PAINEL DA PROPRIETÁRIA (BLINDADO RLS/OWNER)
// ==========================================
export function TelaProprietaria() {
  const navigate = useNavigate();
  
  const [novoNomeFuncionario, setNovoNomeFuncionario] = useState<string>('');
  const [novaEspecialidadeFuncionario, setNovaEspecialidadeFuncionario] = useState<string>('');
  
  const [nomeServico, setNomeServico] = useState('');
  const [precoServico, setPrecoServico] = useState('');
  const [duracaoMinutos, setDuracaoMinutos] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [horaAbertura, setHoraAbertura] = useState('08:00');
  const [almocoInicio, setAlmocoInicio] = useState('12:00');
  const [almocoFim, setAlmocoFim] = useState('13:00');
  const [horaFechamento, setHoraFechamento] = useState('18:00');
  const [whatsappProfissional, setWhatsappProfissional] = useState('');
  const [listaServicos, setListaServicos] = useState<any[]>([]);
  const [historicoAgendamentos, setHistoricoAgendamentos] = useState<any[]>([]);
  
  const [abaAtiva, setAbaAtiva] = useState<'financeiro' | 'agendamentos' | 'configuracao'>('agendamentos');
  const [idServicoSendoEditado, setIdServicoSendoEditado] = useState<string | null>(null);

  const [cobrarSinal, setCobrarSinal] = useState<boolean>(false);
  const [chavePixSinal, setChavePixSinal] = useState<string>('');
  const [salvandoConfigSalao, setSalvandoConfigSalao] = useState<boolean>(false);

  const [modalBaixaAberto, setModalBaixaAberto] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<any>(null);
  const [valorRecebido, setValorRecebido] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('pix');

  const [modalRemarcarAberto, setModalRemarcarAberto] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [novaHora, setNovaHora] = useState('');
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [currentOwnerId, setCurrentOwnerId] = useState<string | null>(null);

  const verificarClienteVIP = (nomeCliente: string, listaAgendamentos: any[]) => {
    const nomeLimpo = nomeCliente.split(' ')[0].toLowerCase();
    const atendimentosConcluidos = listaAgendamentos.filter(
      (agendamento) => 
        (agendamento.nome_cliente || '').toLowerCase().includes(nomeLimpo) && 
        agendamento.status === 'concluido'
    );
    return atendimentosConcluidos.length >= 2;
  };

  const buscarFuncionarios = useCallback(async (ownerId: string) => {
    const { data } = await supabase.from('funcionarios').select('*').eq('owner_id', ownerId);
    if (data) setFuncionarios(data);
  }, []);

  const carregarDadosPainel = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setCurrentOwnerId(user.id);

      // 1. Checa status da assinatura do salão da usuária
      const { data: salonData } = await supabase.from('salons').select('*').eq('owner_id', user.id).single();
      const subStatus = salonData?.subscription_status || 'active';
      if (subStatus !== 'active') {
        navigate('/assinatura-pendente');
        return;
      }

      if (salonData) {
        if (salonData.hora_abertura) setHoraAbertura(salonData.hora_abertura);
        if (salonData.almoco_inicio) setAlmocoInicio(salonData.almoco_inicio);
        if (salonData.almoco_fim) setAlmocoFim(salonData.almoco_fim);
        if (salonData.hora_fechamento) setHoraFechamento(salonData.hora_fechamento);
        if (salonData.whatsapp_profissional) setWhatsappProfissional(salonData.whatsapp_profissional);
        if (salonData.cobrar_sinal !== undefined) setCobrarSinal(Boolean(salonData.cobrar_sinal));
        if (salonData.chave_pix_sinal) setChavePixSinal(salonData.chave_pix_sinal);
      }

      // 2. Carrega apenas catálogo limpo de serviços do owner
      const { data: servs } = await supabase.from('servicos').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
      if (servs) setListaServicos(servs);

      // 3. Carrega agendamentos restritos ao owner_id (ou sem owner_id legado)
      const { data: agends, error: errAgend } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('owner_id', user.id)
        .order('data_hora', { ascending: true });
      if (errAgend) throw errAgend;
      if (agends) setHistoricoAgendamentos(agends);

    } catch (error: any) { 
      console.error(error.message); 
    }
  }, [navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setCurrentOwnerId(session.user.id);
        carregarDadosPainel();
        buscarFuncionarios(session.user.id);
      }
    });
  }, [navigate, carregarDadosPainel, buscarFuncionarios]);

  const deletarFuncionario = async (id: number | string) => {
    const { error } = await supabase.from('funcionarios').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }
    if (currentOwnerId) await buscarFuncionarios(currentOwnerId);
  };

  const cadastrarFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNomeFuncionario.trim()) {
      alert('Digite o nome da profissional.');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const usuarioLogadoId = session?.user?.id;
    if (!usuarioLogadoId) return;

    const { error } = await supabase.from('funcionarios').insert([{ 
      nome_funcionario: novoNomeFuncionario.trim(), 
      especialidade: novaEspecialidadeFuncionario.trim() || 'Geral',
      owner_id: usuarioLogadoId 
    }]);

    if (error) {
      alert('Erro ao salvar no Supabase: ' + error.message);
      return;
    }

    setNovoNomeFuncionario('');
    setNovaEspecialidadeFuncionario('');
    await buscarFuncionarios(usuarioLogadoId);
    alert('Profissional cadastrada com sucesso!');
  };

  const dispararLembreteWhats = (agend: any) => {
    let numero = (agend.whatsapp_cliente || '').replace(/\D/g, '');
    if (numero.length === 11 || numero.length === 10) numero = `55${numero}`;
    const dataFmt = agend.data_hora ? new Date(agend.data_hora).toLocaleDateString('pt-BR') : '';
    const horaFmt = agend.data_hora ? new Date(agend.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    const texto = `Olá, ${agend.nome_cliente || 'cliente'}! Lembrete do horário no *GlowAgenda* em *${dataFmt}* às *${horaFmt}*.\nPosso confirmar presença? ✨`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const salvarConfiguracoesGlobais = async () => {
    setSalvandoConfigSalao(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const payloadConfig = {
        owner_id: user.id,
        hora_abertura: horaAbertura,
        almoco_inicio: almocoInicio,
        almoco_fim: almocoFim,
        hora_fechamento: horaFechamento,
        whatsapp_profissional: whatsappProfissional,
        cobrar_sinal: cobrarSinal,
        chave_pix_sinal: chavePixSinal,
        subscription_status: 'active'
      };

      const { error } = await supabase
        .from('salons')
        .upsert(payloadConfig, { onConflict: 'owner_id' });

      if (error) throw error;

      alert('Configurações e Chave Pix salvas com sucesso!');
      await carregarDadosPainel();
    } catch (error: any) {
      alert('Erro ao salvar configurações: ' + error.message);
    } finally {
      setSalvandoConfigSalao(false);
    }
  };

  const salvarDadosDona = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setCarregando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const payloadServico = {
        owner_id: user.id,
        nome_servico: nomeServico, 
        preco: parseFloat(precoServico), 
        duracao_minutos: parseInt(duracaoMinutos)
      };

      if (idServicoSendoEditado) {
        await supabase.from('servicos').update(payloadServico).eq('id', idServicoSendoEditado).eq('owner_id', user.id);
        setIdServicoSendoEditado(null);
      } else {
        await supabase.from('servicos').insert([payloadServico]);
      }
      setNomeServico(''); setPrecoServico(''); setDuracaoMinutos('');
      carregarDadosPainel();
    } catch (error: any) { alert(error.message); } finally { setCarregando(false); }
  };

  const iniciarEdicao = (servico: any) => {
    setIdServicoSendoEditado(servico.id); 
    setNomeServico(servico.nome_servico); 
    setPrecoServico(servico.preco.toString()); 
    setDuracaoMinutos(servico.duracao_minutos.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletarServico = async (idServico: string) => {
    if (confirm('Excluir serviço?')) { 
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('servicos').delete().eq('id', idServico).eq('owner_id', user.id); 
        carregarDadosPainel(); 
      }
    }
  };

  const confirmarBaixa = async () => {
    if (!agendamentoSelecionado) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('agendamentos').update({ status: 'concluido', valor_pago: parseFloat(valorRecebido) || 0, forma_pagamento: formaPagamento }).eq('id', agendamentoSelecionado.id).eq('owner_id', user.id);
      setModalBaixaAberto(false); carregarDadosPainel();
    }
  };

  const deletarAgendamento = async (id: string) => {
    if (confirm('Excluir agendamento?')) { 
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('agendamentos').delete().eq('id', id).eq('owner_id', user.id); 
        carregarDadosPainel(); 
      }
    }
  };

  const salvarRemarcacao = async () => {
    if (!agendamentoSelecionado || !novaData || !novaHora) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const novaDataHoraCompleta = new Date(`${novaData}T${novaHora}:00`);
      await supabase.from('agendamentos').update({ data_hora: novaDataHoraCompleta.toISOString() }).eq('id', agendamentoSelecionado.id).eq('owner_id', user.id);
      setModalRemarcarAberto(false); carregarDadosPainel();
    }
  };

  const proximosAgendamentos = historicoAgendamentos.filter(agend => {
    const st = (agend.status || '').toLowerCase().trim();
    return st === '' || st === 'pendente';
  });

  const totalAgendamentos = historicoAgendamentos.filter(curr => (curr.status || '').toLowerCase() === 'concluido').length;

  const lancamentosConcluidos = historicoAgendamentos.filter(
    (agend) => (agend.status || '').toLowerCase() === 'concluido'
  );

  const entradasHoje = lancamentosConcluidos.reduce((total, l) => total + (Number(l.valor_pago) || Number(l.preco) || 0), 0);
  const custosEstimados = entradasHoje * 0.15; 
  const lucroLiquidoHoje = entradasHoje - custosEstimados;

  const percentualComissao = 0.50; 
  const totalComissaoParceiras = lancamentosConcluidos.reduce((total, l) => {
    if (l.funcionario_id || (l.nome_funcionario && l.nome_funcionario !== 'Dona do Salão')) {
      return total + ((Number(l.valor_pago) || Number(l.preco) || 0) * percentualComissao);
    }
    return total;
  }, 0);

  const caixaLiquidoPrincipalSalao = lucroLiquidoHoje - totalComissaoParceiras;

  return (
    <div style={{ backgroundColor: '#121214', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', fontFamily: 'sans-serif', padding: '20px', color: '#fff', gap: '20px' }}>
      
      {/* MENU SUPERIOR (3 ABAS) */}
      <div style={{ width: '100%', maxWidth: '380px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#202024', padding: '10px 15px', borderRadius: '15px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button onClick={() => setAbaAtiva('financeiro')} style={{ backgroundColor: abaAtiva === 'financeiro' ? '#ff4a7d' : 'transparent', border: 'none', color: '#fff', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>📊 Finanças</button>
          <button onClick={() => setAbaAtiva('agendamentos')} style={{ backgroundColor: abaAtiva === 'agendamentos' ? '#ff4a7d' : 'transparent', border: 'none', color: '#fff', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>🗓️ Agendamentos</button>
          <button onClick={() => setAbaAtiva('configuracao')} style={{ backgroundColor: abaAtiva === 'configuracao' ? '#ff4a7d' : 'transparent', border: 'none', color: '#fff', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>⚙️ Ajustes</button>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} style={{ backgroundColor: 'transparent', border: '1px solid #ff4a7d', color: '#ff4a7d', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px' }}>Sair</button>
      </div>

      {/* ABA FINANCEIRO */}
      {abaAtiva === 'financeiro' && (
        <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: '5px 0 0 0', color: '#fff', fontSize: '16px' }}>📊 Tela de Caixa e Financeiro</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <div style={{ backgroundColor: '#29292e', padding: '15px', borderRadius: '8px', borderLeft: '5px solid #4caf50' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#aaa' }}>Total de Entradas (Sessões: {totalAgendamentos})</p>
              <h2 style={{ margin: '5px 0 0 0', color: '#4caf50', fontSize: '20px' }}>R$ {entradasHoje.toFixed(2)}</h2>
            </div>
            <div style={{ backgroundColor: '#29292e', padding: '15px', borderRadius: '8px', borderLeft: '5px solid #f44336' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#aaa' }}>Custos (15% est.)</p>
              <h2 style={{ margin: '5px 0 0 0', color: '#f44336', fontSize: '20px' }}>R$ {custosEstimados.toFixed(2)}</h2>
            </div>
            <div style={{ backgroundColor: '#29292e', padding: '15px', borderRadius: '8px', borderLeft: '5px solid #00bcd4' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#aaa' }}>Lucro Líquido</p>
              <h2 style={{ margin: '5px 0 0 0', color: '#00bcd4', fontSize: '20px' }}>R$ {lucroLiquidoHoje.toFixed(2)}</h2>
            </div>
          </div>

          <h3 style={{ margin: '15px 0 0 0', color: '#fff', fontSize: '16px' }}>📑 Extrato de Lançamentos</h3>
          <div style={{ backgroundColor: '#29292e', borderRadius: '8px', padding: '12px', width: '100%', boxSizing: 'border-box' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #444', color: '#aaa', fontSize: '12px' }}>
                  <th style={{ paddingBottom: '8px' }}>Atendimento / Profissional</th>
                  <th style={{ paddingBottom: '8px' }}>Pagamento</th>
                  <th style={{ paddingBottom: '8px', textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '13px' }}>
                {lancamentosConcluidos.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '15px 0', textAlign: 'center', color: '#888' }}>Nenhum lançamento concluído.</td>
                  </tr>
                ) : (
                  lancamentosConcluidos.map((l) => {
                    const funcObj = funcionarios.find(f => f.id === l.funcionario_id);
                    const nomeFuncStr = funcObj ? funcObj.nome_funcionario : (l.nome_funcionario || 'Dona do Salão');
                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid #333' }}>
                        <td style={{ padding: '10px 0' }}>
                          <div style={{ fontWeight: 'bold' }}>{l.nome_cliente}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>Prof: {nomeFuncStr}</div>
                        </td>
                        <td><span style={{ backgroundColor: '#4c1d95', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase' }}>{l.forma_pagamento || 'pix'}</span></td>
                        <td style={{ textAlign: 'right', color: '#4caf50', fontWeight: 'bold' }}>R$ {(Number(l.valor_pago) || Number(l.preco) || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ margin: '15px 0 0 0', color: '#fff', fontSize: '16px' }}>🤝 Cálculo de Comissões</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <div style={{ backgroundColor: '#29292e', borderRadius: '8px', padding: '15px' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#aaa', fontSize: '13px' }}>Repasse Equipe (50%)</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                <span>Total Comissões</span>
                <span style={{ color: '#ff4a7d' }}>R$ {totalComissaoParceiras.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #38bdf8' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#38bdf8', fontWeight: 'bold' }}>Líquido Caixa Principal</p>
              <h2 style={{ margin: '5px 0 0 0', color: '#38bdf8', fontSize: '24px' }}>R$ {caixaLiquidoPrincipalSalao.toFixed(2)}</h2>
            </div>
          </div>
        </div>
      )}

      {/* ABA AGENDAMENTOS */}
      {abaAtiva === 'agendamentos' && (
        <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#29292e', borderRadius: '20px', padding: '20px' }}>
            <h3 style={{ color: '#fff', margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold' }}>🗓️ Próximos Agendamentos</h3>
            {proximosAgendamentos.length === 0 ? (
              <p style={{ color: '#888', fontSize: '13px', textAlign: 'center' }}>Nenhum agendamento pendente.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {proximosAgendamentos.map((agend) => (
                  <div key={agend.id} style={{ backgroundColor: '#121214', padding: '12px', borderRadius: '10px', border: '1px solid #333' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {agend.nome_cliente}
                      {verificarClienteVIP(agend.nome_cliente, historicoAgendamentos) && (
                        <span style={{ backgroundColor: '#fff0f5', color: '#ff4a7d', fontSize: '11px', padding: '2px 6px', borderRadius: '20px', border: '1px solid #ffb6c1', fontWeight: 'bold' }}>
                          ⭐ VIP
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>📞 {agend.whatsapp_cliente || 'N/A'}</div>
                    <div style={{ fontSize: '12px', color: '#ff4a7d', fontWeight: 'bold', marginTop: '4px' }}>📅 {agend.data_hora ? new Date(agend.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data inválida'}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #222' }}>
                      <button onClick={() => dispararLembreteWhats(agend)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>💬</button>
                      <button onClick={() => { setAgendamentoSelecionado(agend); setValorRecebido('120.00'); setModalBaixaAberto(true); }} style={{ flex: 1, backgroundColor: '#1ebd60', color: '#fff', border: 'none', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>✓ Realizada</button>
                      <button onClick={() => { setAgendamentoSelecionado(agend); setModalRemarcarAberto(true); }} style={{ flex: 1, backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>📅 Remarcar</button>
                      <button onClick={() => deletarAgendamento(agend.id)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA CONFIGURAÇÕES */}
      {abaAtiva === 'configuracao' && (
        <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '30px', padding: '30px 20px', color: '#333', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: '#ff4a7d', textAlign: 'center', margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold' }}>{idServicoSendoEditado ? '📝 Editar Serviço' : 'Configurar meu Studio'}</h2>
            
            <div style={{ backgroundColor: '#fff0f3', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #ffccd5' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#ff4a7d', marginBottom: '10px', textAlign: 'center' }}>⏰ Horário de Funcionamento</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div><span style={{ fontSize: '11px' }}>Abertura</span><input type="text" value={horaAbertura} onChange={(e) => setHoraAbertura(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '12px' }} /></div>
                <div><span style={{ fontSize: '11px' }}>Fechamento</span><input type="text" value={horaFechamento} onChange={(e) => setHoraFechamento(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '12px' }} /></div>
                <div><span style={{ fontSize: '11px' }}>Almoço Início</span><input type="text" value={almocoInicio} onChange={(e) => setAlmocoInicio(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '12px' }} /></div>
                <div><span style={{ fontSize: '11px' }}>Almoço Fim</span><input type="text" value={almocoFim} onChange={(e) => setAlmocoFim(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '12px' }} /></div>
              </div>
              <div style={{ marginTop: '10px' }}><span style={{ fontSize: '11px' }}>WhatsApp do Salão (com DDD)</span><input type="text" value={whatsappProfissional} onChange={(e) => setWhatsappProfissional(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '12px', marginTop: '3px' }} /></div>
              <div style={{ marginTop: '15px', textAlign: 'left' }}><label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}><input type="checkbox" checked={cobrarSinal} onChange={(e) => setCobrarSinal(e.target.checked)} /> Cobrar sinal de R$ 20,00?</label></div>
              {cobrarSinal && (<div style={{ marginTop: '10px', textAlign: 'left' }}><span style={{ fontSize: '11px', color: '#666' }}>Sua Chave PIX:</span><input type="text" value={chavePixSinal} onChange={(e) => setChavePixSinal(e.target.value)} placeholder="Ex: CPF, Telefone ou Chave Aleatória" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '12px', marginTop: '3px' }} /></div>)}
              
              <button 
                type="button" 
                onClick={salvarConfiguracoesGlobais}
                disabled={salvandoConfigSalao}
                style={{ width: '100%', padding: '10px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}
              >
                {salvandoConfigSalao ? 'Salvando Configurações...' : '💾 Salvar Horários, WhatsApp e Chave PIX'}
              </button>
            </div>

            <div style={{ marginTop: '15px', borderTop: '1px solid #ddd', paddingTop: '15px', textAlign: 'left', color: '#333' }}>
              <h4 style={{ color: '#ff4a7d', margin: '0 0 10px 0', fontSize: '15px', fontWeight: 'bold' }}>👥 Gerenciar Equipe</h4>
              <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', marginBottom: '15px' }}>
                <input 
                  type="text" 
                  value={novoNomeFuncionario} 
                  onChange={(e) => setNovoNomeFuncionario(e.target.value)} 
                  placeholder="Nome da Profissional (Ex: Paula)" 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '13px' }} 
                />
                <input 
                  type="text" 
                  value={novaEspecialidadeFuncionario} 
                  onChange={(e) => setNovaEspecialidadeFuncionario(e.target.value)} 
                  placeholder="O que ela faz? (Ex: Sobrancelha, Cílios)" 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '13px' }} 
                />
                <button 
                  type="button" 
                  onClick={cadastrarFuncionario} 
                  style={{ padding: '10px', backgroundColor: '#ff4a7d', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Adicionar Profissional
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(!funcionarios || funcionarios.length === 0) ? (
                  <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', margin: '10px 0' }}>Nenhuma profissional cadastrada.</p>
                ) : (
                  funcionarios.map((func) => (
                    <div key={func.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '6px', border: '1px solid #eee', fontSize: '12px' }}>
                      <span>👤 <b>{func.nome_funcionario}</b> — {func.especialidade || 'Geral'}</span>
                      <button 
                        type="button" 
                        onClick={() => deletarFuncionario(func.id)} 
                        style={{ backgroundColor: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Remover
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <form onSubmit={salvarDadosDona} style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '15px' }}>
              <h4 style={{ color: '#ff4a7d', margin: '0 0 10px 0', fontSize: '15px', fontWeight: 'bold' }}>{idServicoSendoEditado ? 'Editar Serviço' : 'Cadastrar Novo Serviço'}</h4>
              <div style={{ marginBottom: '15px', color: '#333' }}>Nome do serviço<input type="text" required value={nomeServico} onChange={(e) => setNomeServico(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', marginTop: '3px' }} /></div>
              <div style={{ marginBottom: '15px', color: '#333' }}>Preço (R$)<input type="number" step="0.01" required value={precoServico} onChange={(e) => setPrecoServico(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', marginTop: '3px' }} /></div>
              <div style={{ marginBottom: '25px', color: '#333' }}>Duração (em minutos)<input type="number" required placeholder="Ex: 60" value={duracaoMinutos} onChange={(e) => setDuracaoMinutos(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', marginTop: '3px' }} /></div>

              <button type="submit" disabled={carregando} style={{ width: '100%', padding: '15px', backgroundColor: idServicoSendoEditado ? '#1ebd60' : '#ff4a7d', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                {carregando ? 'Salvando...' : idServicoSendoEditado ? 'Confirmar Alterações' : 'Salvar no Catálogo'}
              </button>
            </form>
          </div>

          <div style={{ backgroundColor: '#29292e', borderRadius: '20px', padding: '20px' }}>
            <h3 style={{ color: '#fff', margin: '0 0 15px 0', fontSize: '16px', textAlign: 'center' }}>📋 Meus Serviços Ativos</h3>
            {listaServicos.length === 0 ? (
              <p style={{ color: '#888', fontSize: '14px', textAlign: 'center' }}>Nenhum serviço cadastrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {listaServicos.map((serv) => (
                  <div key={serv.id} style={{ backgroundColor: '#121214', padding: '12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{serv.nome_servico}</div>
                      <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>{serv.duracao_minutos} min • <span style={{ color: '#ff4a7d', fontWeight: 'bold' }}>R$ {(serv.preco || 0).toFixed(2)}</span></div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => iniciarEdicao(serv)} style={{ backgroundColor: 'transparent', border: 'none', color: '#1ebd60', cursor: 'pointer', fontSize: '16px' }}>✏️</button>
                      <button onClick={() => deletarServico(serv.id)} style={{ backgroundColor: 'transparent', border: 'none', color: '#ff4a7d', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE BAIXA (CONCLUIR ATENDIMENTO) */}
      {modalBaixaAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: '#202024', borderRadius: '20px', padding: '25px', maxWidth: '340px', width: '100%', color: '#fff' }}>
            <h3 style={{ color: '#1ebd60', margin: '0 0 10px 0', fontSize: '18px' }}>Concluir Atendimento</h3>
            <div style={{ marginBottom: '12px' }}><span style={{ fontSize: '12px', color: '#ccc' }}>Valor Recebido (R$)</span><input type="number" step="0.01" value={valorRecebido} onChange={(e) => setValorRecebido(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#121214', color: '#fff', marginTop: '4px' }} /></div>
            <div style={{ marginBottom: '20px' }}><span style={{ fontSize: '12px', color: '#ccc' }}>Forma de Pagamento</span><select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#121214', color: '#fff', marginTop: '4px' }}><option value="pix">PIX</option><option value="cartao_credito">Cartão de Crédito</option><option value="cartao_debito">Cartão de Débito</option><option value="dinheiro">Dinheiro</option></select></div>
            <div style={{ display: 'flex', gap: '10px' }}><button onClick={() => setModalBaixaAberto(false)} style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', border: '1px solid #444', color: '#ccc', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button><button onClick={confirmarBaixa} style={{ flex: 1, padding: '10px', backgroundColor: '#1ebd60', border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>Confirmar</button></div>
          </div>
        </div>
      )}

      {/* MODAL DE REMARCAÇÃO */}
      {modalRemarcarAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: '#202024', borderRadius: '20px', padding: '25px', maxWidth: '340px', width: '100%', color: '#fff' }}>
            <h3 style={{ color: '#d97706', margin: '0 0 10px 0', fontSize: '18px' }}>Remarcar Atendimento</h3>
            <div style={{ marginBottom: '12px', marginTop: '10px' }}><span style={{ fontSize: '12px', color: '#ccc' }}>Nova Data</span><input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#121214', color: '#fff', marginTop: '4px' }} /></div>
            <div style={{ marginBottom: '20px' }}><span style={{ fontSize: '12px', color: '#ccc' }}>Novo Horário</span><input type="time" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#121214', color: '#444', colorScheme: 'dark', marginTop: '4px' }} /></div>
            <div style={{ display: 'flex', gap: '10px' }}><button onClick={() => setModalRemarcarAberto(false)} style={{ flex: '1', padding: '10px', backgroundColor: 'transparent', border: '1px solid #444', color: '#ccc', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button><button onClick={salvarRemarcacao} style={{ flex: '1', padding: '10px', backgroundColor: '#d97706', border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>Salvar Data</button></div>
          </div>
        </div>
      )}
    </div>
  );
}