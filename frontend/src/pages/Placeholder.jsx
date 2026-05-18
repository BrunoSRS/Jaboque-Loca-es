import { PageHeader, Card, CardBody } from '../components/ui';

export default function Placeholder({ title, subtitle }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <CardBody className="text-center py-16">
          <p className="text-4xl mb-4">🚧</p>
          <p className="text-lg font-medium text-jaboque-navy">Em breve</p>
          <p className="text-gray-500 text-sm mt-2">Este módulo será implementado em uma próxima versão.</p>
        </CardBody>
      </Card>
    </>
  );
}
