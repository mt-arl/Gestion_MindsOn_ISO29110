import { PrismaClient, AdminRole, StudentStatus, ClassModality, TuitionFeeStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando script de semilla (Seeding MindsOn database)...');

  // Limpieza previa para garantizar idempotencia en desarrollo
  await prisma.payment.deleteMany();
  await prisma.tuitionFee.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.adminUser.deleteMany();

  // 1. Crear Usuario Administrador
  console.log('👤 Creando usuario administrador...');
  const admin = await prisma.adminUser.create({
    data: {
      name: 'Administrador Principal MindsOn',
      email: 'admin@mindson.edu',
      passwordHash: '$2a$12$e8Yy8fQO3z2R7bYpM9u0ZeC4b7qH9iN1GvU3sF6wX1a2b3c4d5e6f',
      role: AdminRole.SUPERADMIN,
    },
  });
  console.log(`✅ Admin creado: ${admin.email} (${admin.role})`);

  // 2. Crear 2 Profesores
  console.log('👨‍🏫 Creando profesores...');
  const teacher1 = await prisma.teacher.create({
    data: {
      ci: '10293847',
      firstName: 'Roberto',
      lastName: 'Gómez Alarcón',
      email: 'roberto.gomez@mindson.edu',
      phone: '+591 71234567',
    },
  });

  const teacher2 = await prisma.teacher.create({
    data: {
      ci: '84736291',
      firstName: 'Diana',
      lastName: 'Mendoza Castillo',
      email: 'diana.mendoza@mindson.edu',
      phone: '+591 79876543',
    },
  });
  console.log(`✅ Profesores creados: ${teacher1.firstName} ${teacher1.lastName} y ${teacher2.firstName} ${teacher2.lastName}`);

  // 3. Crear 3 Clases (Virtual, Híbrida y Presencial)
  console.log('📚 Creando clases...');
  
  // Clase 1: Virtual ($50.00)
  const virtualClass = await prisma.class.create({
    data: {
      code: 'ENG-A1-VIRTUAL',
      name: 'Inglés Principiante A1 (Virtual)',
      modality: ClassModality.VIRTUAL,
      schedule: 'Mar y Jue 19:00 - 21:00 (Zoom)',
      monthlyPrice: 50.00,
      primaryTeacherId: teacher1.id,
      assistantTeacherId: teacher2.id,
    },
  });

  // Clase 2: Híbrida ($65.00)
  const hybridClass = await prisma.class.create({
    data: {
      code: 'ENG-B1-HIBRIDO',
      name: 'Inglés Intermedio B1 (Semipresencial)',
      modality: ClassModality.HIBRIDA,
      schedule: 'Mar: Presencial (Aula 102) | Jue: Virtual (Zoom) 18:30 - 20:30',
      monthlyPrice: 65.00,
      primaryTeacherId: teacher1.id,
      assistantTeacherId: null,
    },
  });

  // Clase 3: Presencial ($70.00)
  const inPersonClass = await prisma.class.create({
    data: {
      code: 'ENG-B2-PRESENCIAL',
      name: 'Inglés Avanzado B2 (Presencial - Aula 102)',
      modality: ClassModality.PRESENCIAL,
      schedule: 'Lun, Mié y Vie 18:00 - 20:00',
      monthlyPrice: 70.00,
      primaryTeacherId: teacher2.id,
      assistantTeacherId: null,
    },
  });
  console.log(`✅ Clases creadas: ${virtualClass.code} (Virtual), ${hybridClass.code} (Híbrida) y ${inPersonClass.code} (Presencial)`);

  // Configuración de fechas dinámicas
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const futureDueDate = new Date(currentYear, currentMonth - 1, 25, 23, 59, 59);
  const pastDueDate = new Date(currentYear, currentMonth - 2, 5, 23, 59, 59);

  // 4. Crear 3 Estudiantes con diferentes estados y clases
  console.log('🎓 Creando estudiantes con mensualidades...');

  // Estudiante 1: Clase Virtual - Mensualidad en estado PAID (Pagada)
  const studentPaid = await prisma.student.create({
    data: {
      ci: '73829104',
      firstName: 'Carlos',
      lastName: 'Mendoza Pérez',
      email: 'carlos.mendoza@gmail.com',
      phone: '+591 76543210',
      guardianPhone1: '+591 71112233',
      age: 17,
      gender: 'Masculino',
      address: 'Av. Las Palmas #450',
      status: StudentStatus.ACTIVE,
      currentClassId: virtualClass.id,
    },
  });

  const feePaid = await prisma.tuitionFee.create({
    data: {
      studentId: studentPaid.id,
      classId: virtualClass.id,
      month: currentMonth,
      year: currentYear,
      dueDate: futureDueDate,
      amount: virtualClass.monthlyPrice,
      status: TuitionFeeStatus.PAID,
    },
  });

  await prisma.payment.create({
    data: {
      tuitionFeeId: feePaid.id,
      amountPaid: virtualClass.monthlyPrice,
      paymentDate: new Date(),
      registeredBy: admin.name,
      notes: 'Pago recibido por transferencia bancaria / Comprobante #994821',
    },
  });
  console.log(`✅ Estudiante 1: ${studentPaid.firstName} ${studentPaid.lastName} -> Clase Virtual [PAID] con pago registrado.`);

  // Estudiante 2: Clase Híbrida - Mensualidad en estado PENDING (vigente)
  const studentPending = await prisma.student.create({
    data: {
      ci: '61928374',
      firstName: 'Valeria',
      lastName: 'Rojas Salinas',
      email: 'valeria.rojas@gmail.com',
      phone: '+591 78901234',
      guardianPhone1: '+591 72223344',
      guardianPhone2: '+591 73334455',
      age: 15,
      gender: 'Femenino',
      address: 'Calle Jazmines #120, Condominio Norte',
      status: StudentStatus.ACTIVE,
      currentClassId: hybridClass.id,
    },
  });

  await prisma.tuitionFee.create({
    data: {
      studentId: studentPending.id,
      classId: hybridClass.id,
      month: currentMonth,
      year: currentYear,
      dueDate: futureDueDate,
      amount: hybridClass.monthlyPrice,
      status: TuitionFeeStatus.PENDING,
    },
  });
  console.log(`✅ Estudiante 2: ${studentPending.firstName} ${studentPending.lastName} -> Clase Híbrida [PENDING] (Vence: ${futureDueDate.toLocaleDateString()}).`);

  // Estudiante 3: Clase Presencial - Mensualidad en estado OVERDUE (en mora)
  const studentOverdue = await prisma.student.create({
    data: {
      ci: '50493827',
      firstName: 'Mateo',
      lastName: 'Fernández Quiroga',
      email: 'mateo.fernandez@gmail.com',
      phone: '+591 70011223',
      guardianPhone1: '+591 74445566',
      age: 16,
      gender: 'Masculino',
      address: 'Barrio Equipetrol, Pasaje Los Ceibos #14',
      status: StudentStatus.ACTIVE,
      currentClassId: inPersonClass.id,
    },
  });

  await prisma.tuitionFee.create({
    data: {
      studentId: studentOverdue.id,
      classId: inPersonClass.id,
      month: currentMonth === 1 ? 12 : currentMonth - 1,
      year: currentMonth === 1 ? currentYear - 1 : currentYear,
      dueDate: pastDueDate,
      amount: inPersonClass.monthlyPrice,
      status: TuitionFeeStatus.OVERDUE,
    },
  });
  console.log(`✅ Estudiante 3: ${studentOverdue.firstName} ${studentOverdue.lastName} -> Clase Presencial [OVERDUE] (Vencida: ${pastDueDate.toLocaleDateString()}).`);

  console.log('✨ Base de datos sembrada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando la semilla:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
